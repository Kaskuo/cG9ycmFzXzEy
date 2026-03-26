function showLogin(){
 const card=document.getElementById("launchCard");
 const modal=document.getElementById("loginModal");
 card.style.opacity="0";
 card.style.transform="scale(0.95)";
 setTimeout(()=>{
   card.style.display="none";
   modal.classList.remove("hidden");
 },200);
}
