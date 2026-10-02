import express from "express";
import http from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const rooms = new Map();
const colors = ["red","yellow","green","blue"];
const faces = ["🦊","🐼","🐯","🐸","🐨","🐵","🐰","🐱"];

function makeDeck(){
  const d=[];
  for(const c of colors){
    d.push({c,v:"0"});
    for(let n=1;n<=9;n++){ d.push({c,v:String(n)}); d.push({c,v:String(n)}); }
    for(let i=0;i<2;i++){ d.push({c,v:"+2"}); d.push({c,v:"skip"}); d.push({c,v:"reverse"}); }
  }
  for(let i=0;i<4;i++){d.push({c:"wild",v:"wild"});d.push({c:"wild",v:"+4"});}
  return d.sort(()=>Math.random()-.5);
}
function publicRoom(r){
  return {code:r.code, host:r.host, started:r.started, turn:r.turn,
    top:r.discard[r.discard.length-1], color:r.color,
    players:[...r.players.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,hand:p.hand.length}))};
}
function emitRoom(r){ io.to(r.code).emit("room", publicRoom(r)); }
function addScore(p,n){p.score+=n;}
function newGame(r){
  let deck=makeDeck(); r.discard=[]; r.turn=0; r.color=null; r.direction=1; r.started=true;
  for(const p of r.players.values()) p.hand=[];
  for(let i=0;i<7;i++) for(const p of r.players.values()) p.hand.push(deck.pop());
  let card=deck.pop(); while(card.c==="wild"){deck.unshift(card);card=deck.pop();}
  r.discard=[card]; r.color=card.c; r.deck=deck;
}
function nextIndex(r,step=1){
  const n=r.players.size; r.turn=(r.turn+step*r.direction+n*10)%n;
}
function playable(card, r){
  const top=r.discard[r.discard.length-1];
  return card.c==="wild" || card.c===r.color || card.v===top.v;
}
io.on("connection", s=>{
  s.on("create", ({name})=>{
    const code=Math.random().toString(36).slice(2,7).toUpperCase();
    const p={id:s.id,name:name||"玩家",avatar:faces[Math.floor(Math.random()*faces.length)],hand:[],score:0};
    rooms.set(code,{code,host:s.id,players:new Map([[s.id,p]]),started:false,turn:0,direction:1,discard:[],deck:[],color:null,chat:[]});
    s.join(code); s.data.code=code; s.emit("joined",{code,id:s.id}); emitRoom(rooms.get(code));
  });
  s.on("join", ({code,name})=>{
    const r=rooms.get(String(code).toUpperCase()); if(!r) return s.emit("errorMsg","房间不存在");
    if(r.players.size>=8) return s.emit("errorMsg","房间已满");
    if(r.started) return s.emit("errorMsg","游戏已经开始");
    const p={id:s.id,name:name||"玩家",avatar:faces[Math.floor(Math.random()*faces.length)],hand:[],score:0};
    r.players.set(s.id,p); s.join(r.code); s.data.code=r.code; s.emit("joined",{code:r.code,id:s.id}); emitRoom(r);
  });
  s.on("start",()=>{
    const r=rooms.get(s.data.code); if(!r||r.host!==s.id||r.players.size<2)return;
    newGame(r); for(const p of r.players.values()) io.to(p.id).emit("hand",p.hand); emitRoom(r);
  });
  s.on("play",({index,wildColor})=>{
    const r=rooms.get(s.data.code); if(!r||!r.started)return;
    const arr=[...r.players.values()], p=arr[r.turn]; if(p.id!==s.id)return;
    const card=p.hand[index]; if(!card||!playable(card,r))return;
    p.hand.splice(index,1); r.discard.push(card); if(card.c==="wild")r.color=wildColor||"red"; else r.color=card.c;
    let step=1;
    if(card.v==="reverse") {r.direction*=-1; if(arr.length===2)step=2;}
    if(card.v==="skip") step=2;
    if(card.v==="+2") { nextIndex(r,1); const q=arr[r.turn]; const d=r.deck.pop(); if(d)q.hand.push(d); const d2=r.deck.pop(); if(d2)q.hand.push(d2); step=1; }
    if(card.v==="+4") { nextIndex(r,1); const q=arr[r.turn]; for(let i=0;i<4;i++){const d=r.deck.pop();if(d)q.hand.push(d)} step=1; }
    if(p.hand.length===0){ addScore(p,1); io.to(r.code).emit("win",{name:p.name,avatar:p.avatar}); newGame(r); }
    else nextIndex(r,step);
    for(const q of r.players.values()) io.to(q.id).emit("hand",q.hand); emitRoom(r);
  });
  s.on("draw",()=>{
    const r=rooms.get(s.data.code); if(!r||!r.started)return; const arr=[...r.players.values()],p=arr[r.turn]; if(p.id!==s.id)return;
    const d=r.deck.pop(); if(d)p.hand.push(d); nextIndex(r); io.to(p.id).emit("hand",p.hand); emitRoom(r);
  });
  s.on("chat",({text})=>{
    const r=rooms.get(s.data.code); if(!r||!text?.trim())return;
    const p=r.players.get(s.id); io.to(r.code).emit("chat",{name:p.name,avatar:p.avatar,text:text.trim().slice(0,120)});
  });
  s.on("emoji",({emoji})=>{const r=rooms.get(s.data.code);const p=r?.players.get(s.id);if(r&&p)io.to(r.code).emit("emoji",{avatar:p.avatar,emoji});});
  s.on("disconnect",()=>{const r=rooms.get(s.data.code);if(!r)return;r.players.delete(s.id);if(!r.players.size)rooms.delete(r.code);else{if(r.host===s.id)r.host=[...r.players.keys()][0];emitRoom(r)}});
});
server.listen(process.env.PORT||3000,()=>console.log("UNO server on 3000"));
