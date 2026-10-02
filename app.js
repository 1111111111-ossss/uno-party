const socket=io();let myId=null,myHand=[],room=null;
const $=id=>document.getElementById(id), colors={red:"红",yellow:"黄",green:"绿",blue:"蓝"};
function cls(c){return c.c==="wild"?"wild":c.c}
function label(c){return c.v==="+4"?"＋4":c.v==="+2"?"＋2":c.v==="skip"?"跳过":c.v==="reverse"?"↻":c.v==="wild"?"WILD":c.v}
function render(){if(!room)return;$("lobby").hidden=true;$("game").hidden=false;$("code").textContent=room.code;
$("players").innerHTML=room.players.map((p,i)=>`<div class="player ${i===room.turn?"active":""}"><div class="avatar">${p.avatar}</div><b>${p.name}</b><small>🃏 ${p.hand} · ⭐ ${p.score}</small></div>`).join("");
$("turn").textContent="轮到："+(room.players[room.turn]?.name||"");$("top").className="card big "+cls(room.top);$("top").textContent=label(room.top);$("colorbar").textContent="当前颜色："+(colors[room.color]||"任意");
$("start").style.display=room.host===myId&&!room.started?"block":"none";$("draw").style.display=room.started?"block":"none";
$("hand").innerHTML=myHand.map((c,i)=>`<div class="card ${cls(c)}" data-i="${i}">${label(c)}</div>`).join("");
document.querySelectorAll(".hand .card").forEach(x=>x.onclick=()=>play(+x.dataset.i));}
function play(i){let c=myHand[i];if(!c)return;if(c.c==="wild"){let x=prompt("选择颜色：red / yellow / green / blue","red");if(!["red","yellow","green","blue"].includes(x))return;socket.emit("play",{index:i,wildColor:x})}else socket.emit("play",{index:i})}
$("create").onclick=()=>socket.emit("create",{name:$("name").value||"玩家"});
$("join").onclick=()=>socket.emit("join",{name:$("name").value||"玩家",code:$("joinCode").value});
$("start").onclick=()=>socket.emit("start");$("draw").onclick=()=>socket.emit("draw");
$("send").onclick=()=>send();$("chatInput").onkeydown=e=>{if(e.key==="Enter")send()};function send(){let t=$("chatInput").value.trim();if(t){socket.emit("chat",{text:t});$("chatInput").value=""}}
$("emojis").onclick=e=>{if(e.target.textContent.trim())socket.emit("emoji",{emoji:e.target.textContent.trim()})};
$("invite").onclick=async()=>{const url=location.origin+"/?room="+room.code;try{if(navigator.share){await navigator.share({title:"UNO Party",text:"来和我玩 UNO！",url})}else if(navigator.clipboard){await navigator.clipboard.writeText(url);$("msg").textContent="邀请链接已复制！"}else{prompt("复制这个邀请链接：",url)}}catch(e){}}try{await navigator.clipboard.writeText(url);$("msg").textContent="邀请链接已复制！"}catch{$("msg").textContent=url}};
socket.on("joined",x=>{myId=x.id;$("code").textContent=x.code});
socket.on("room",r=>{room=r;render()});socket.on("hand",h=>{myHand=h;render()});
socket.on("chat",m=>{$("chat").insertAdjacentHTML("beforeend",`<div class="bubble">${m.avatar} <b>${m.name}</b>：${m.text}</div>`);$("chat").scrollTop=99999});
socket.on("emoji",m=>{let e=document.createElement("div");e.textContent=m.avatar+" "+m.emoji;e.style.cssText="position:fixed;left:50%;top:45%;font-size:42px;animation:pop 1s forwards;z-index:9";document.body.appendChild(e);setTimeout(()=>e.remove(),1000)});
socket.on("win",m=>alert(`${m.avatar} ${m.name} 获胜！`));socket.on("errorMsg",m=>{$("msg").textContent=m});
const q=new URLSearchParams(location.search).get("room");if(q){$("joinCode").value=q.toUpperCase()}