const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const cartKey = 'fashion_cart_v1';
const profileKey = 'fashion_profile_v1';
let products = [];
let currentProduct = null;

function getCart(){ return JSON.parse(localStorage.getItem(cartKey) || '[]'); }
function setCart(c){ localStorage.setItem(cartKey, JSON.stringify(c)); renderCartCount(); }
function getProfile(){ return JSON.parse(localStorage.getItem(profileKey) || '{}'); }
function setProfile(p){ localStorage.setItem(profileKey, JSON.stringify(p)); }
function renderCartCount(){ const el=$('#cartCount'); if(el) el.textContent = getCart().reduce((s,i)=>s+i.quantity,0); }
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; t.style.cssText='position:fixed;left:50%;top:84px;transform:translateX(-50%);background:#172033;color:white;padding:12px 18px;border-radius:999px;z-index:99;font-weight:800;box-shadow:0 14px 30px rgba(0,0,0,.18)'; document.body.appendChild(t); setTimeout(()=>t.remove(),1900); }

function addToCart(product, size, color, quantity=1){
  const cart=getCart(); const key=`${product.id}-${size}-${color}`; const found=cart.find(i=>i.key===key);
  if(found) found.quantity += quantity; else cart.push({key,productId:product.id,name:product.name,price:product.price,image:product.image,size,color,quantity});
  setCart(cart); toast('Đã thêm vào giỏ hàng');
}
function removeCart(key){ setCart(getCart().filter(i=>i.key!==key)); renderCart(); }
function updateQty(key, qty){ const c=getCart(); const it=c.find(i=>i.key===key); if(it) it.quantity=Math.max(1,Number(qty)); setCart(c); renderCart(); }

function productCard(p){
  return `<article class="product">
    <a href="./product.html?id=${p.id}"><div class="product-img" style="background-image:url('${p.image}')"></div></a>
    <div class="p-body">
      <div class="p-meta"><span>${p.category}</span><span>★ ${p.rating}</span></div>
      <a href="./product.html?id=${p.id}" class="p-name">${p.name}</a>
      <div><span class="price">${fmt(p.price)}</span><span class="old">${fmt(p.oldPrice)}</span></div>
      <div class="muted" style="font-size:13px;margin-top:6px">${p.material} · ${p.fit}</div>
      <div class="p-actions"><a class="btn secondary" href="./product.html?id=${p.id}">Chi tiết</a><button class="btn" onclick='quickAdd("${p.id}")'>Thêm</button></div>
    </div>
  </article>`;
}
async function loadProducts(){
  const params = new URLSearchParams();
  const q=$('#q')?.value || ''; const category=$('#category')?.value || ''; const sort=$('#sort')?.value || ''; const min=$('#min')?.value || ''; const max=$('#max')?.value || '';
  if(q) params.set('q',q); if(category) params.set('category',category); if(sort) params.set('sort',sort); if(min) params.set('min',min); if(max) params.set('max',max);
  products = await fetch('/api/products?'+params).then(r=>r.json());
  const grid=$('#productGrid'); if(grid) grid.innerHTML = products.map(productCard).join('');
  const total=$('#totalProducts'); if(total) total.textContent = products.length;
}
function quickAdd(id){ const p=products.find(x=>x.id===id); if(p) addToCart(p,p.sizes?.[0]||'M',p.colors?.[0]||'Đen'); }
window.quickAdd=quickAdd;

async function loadDetail(){
  const id=new URLSearchParams(location.search).get('id'); if(!id) return;
  const p=await fetch('/api/products/'+id).then(r=>r.json()); currentProduct=p; document.title=p.name;
  $('#detailImage').style.backgroundImage=`url('${p.image}')`; $('#detailName').textContent=p.name; $('#detailBrand').textContent=p.brand+' · '+p.category+' · '+p.gender;
  $('#detailPrice').textContent=fmt(p.price); $('#detailOld').textContent=fmt(p.oldPrice); $('#detailDesc').textContent=p.description;
  $('#detailPromo').textContent=p.promotion; $('#detailCare').textContent=p.care; $('#detailRating').textContent='★ '+p.rating+' · Đã bán '+p.sold;
  $('#sizeSelect').innerHTML=p.sizes.map(s=>`<option>${s}</option>`).join(''); $('#colorSelect').innerHTML=p.colors.map(c=>`<option>${c}</option>`).join('');
  $('#chips').innerHTML=[p.material,p.fit,p.occasion,...p.highlights].map(x=>`<span class="chip">${x}</span>`).join('');
  $('#competitors').innerHTML = `<tr><th>Nơi bán</th><th>Giá</th><th>Nhận xét</th></tr><tr><td><b>FashionAI Shop</b></td><td><b>${fmt(p.price)}</b></td><td>${p.promotion}, hỗ trợ AI theo sản phẩm</td></tr>` + p.competitors.map(c=>`<tr><td>${c.competitor}</td><td>${fmt(c.price)}</td><td>${c.note}</td></tr>`).join('');
  $('#similarGrid').innerHTML=p.similar.map(productCard).join('');
  $('#addDetail').onclick=()=>addToCart(p,$('#sizeSelect').value,$('#colorSelect').value,Number($('#qty').value||1));
  $('#askThis').onclick=()=>openAI(p);
}

function renderCart(){
  const cart=getCart();
  const html = cart.length===0
    ? '<div class="empty-cart">Giỏ hàng đang trống.</div>'
    : cart.map(i=>`<div class="cart-item"><div class="cart-img" style="background-image:url('${i.image}')"></div><div><b>${i.name}</b><div class="muted">Size ${i.size} · ${i.color}</div><div class="price">${fmt(i.price)}</div><input class="input" style="width:88px;padding:8px;margin-top:8px" type="number" min="1" value="${i.quantity}" onchange="updateQty('${i.key}',this.value)"></div><button class="btn secondary" onclick="removeCart('${i.key}')">Xóa</button></div>`).join('');
  ['#cartItems','#cartItemsDrawer'].forEach(sel=>{ const box=$(sel); if(box) box.innerHTML=html; });
  const subtotal=cart.reduce((s,i)=>s+i.price*i.quantity,0), ship=subtotal>=800000||subtotal===0?0:30000, discount=subtotal>=1200000?100000:0;
  $('#subtotal') && ($('#subtotal').textContent=fmt(subtotal)); $('#shipping') && ($('#shipping').textContent=fmt(ship)); $('#discount') && ($('#discount').textContent=discount?'-'+fmt(discount):fmt(0)); $('#total') && ($('#total').textContent=fmt(subtotal+ship-discount));
}
window.removeCart=removeCart; window.updateQty=updateQty;
function openCart(){ $('#cartDrawer')?.classList.add('show'); renderCart(); }
function closeCart(){ $('#cartDrawer')?.classList.remove('show'); }

function fillProfile(){ const p=getProfile(); ['fullName','phone','email','address','size'].forEach(k=>{ const el=$('#'+k); if(el&&p[k]) el.value=p[k]; }); }
async function placeOrder(e){
  e.preventDefault(); const cart=getCart(); if(!cart.length) return toast('Giỏ hàng đang trống');
  const customer={fullName:$('#fullName').value, phone:$('#phone').value, email:$('#email').value, address:$('#address').value, size:$('#size').value}; setProfile(customer);
  const items=cart.map(i=>({productId:i.productId,size:i.size,color:i.color,quantity:i.quantity}));
  const body={customer,items,paymentMethod:$('#paymentMethod').value,shippingMethod:$('#shippingMethod').value,note:$('#note').value};
  const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const order=await r.json();
  if(!r.ok) return toast(order.message||'Lỗi đặt hàng'); setCart([]); location.href='./success.html?id='+order.id+'&total='+order.total;
}

function openAI(product=currentProduct){ currentProduct=product||currentProduct; $('#aiModal')?.classList.add('show'); const name=currentProduct?currentProduct.name:'sản phẩm trên shop'; $('#aiTitle').textContent='💖 AI tư vấn về '+name; if($('#chatLog') && !$('#chatLog').dataset.init){ $('#chatLog').dataset.init='1'; botMsg('Chào bạn, mình là AI Stylist. Bạn bấm “Hỏi AI về sản phẩm này” hoặc nhập câu hỏi để mình tư vấn size, chất liệu, phối đồ, ưu đãi và cách mua online nhé.'); } }
function closeAI(){ $('#aiModal')?.classList.remove('show'); }
function botMsg(t){ $('#chatLog').insertAdjacentHTML('beforeend',`<div class="msg bot">${t}</div>`); $('#chatLog').scrollTop=99999; }
function userMsg(t){ $('#chatLog').insertAdjacentHTML('beforeend',`<div class="msg user">${t}</div>`); $('#chatLog').scrollTop=99999; }
async function sendAI(e){
  e.preventDefault(); const input=$('#chatInput'); const text=input.value.trim(); if(!text) return; input.value=''; userMsg(text); botMsg('Đang suy nghĩ...');
  const productId=currentProduct?.id || new URLSearchParams(location.search).get('id') || products[0]?.id; const profile=getProfile();
  const r=await fetch('/api/ai/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,question:text,profile})}); const data=await r.json();
  $$('#chatLog .bot').at(-1).textContent=data.answer || 'Mình chưa trả lời được, bạn thử hỏi lại nhé.';
}

function initCommon(){ renderCartCount(); $('#cartBtn')?.addEventListener('click',openCart); $('#closeCart')?.addEventListener('click',closeCart); $('#aiBtn')?.addEventListener('click',()=>openAI()); $('#closeAI')?.addEventListener('click',closeAI); $('#chatForm')?.addEventListener('submit',sendAI); }
document.addEventListener('DOMContentLoaded',()=>{ initCommon(); if($('#productGrid')){ loadProducts(); ['q','category','sort','min','max'].forEach(id=>$('#'+id)?.addEventListener('input',loadProducts)); } if($('#detailName')) loadDetail(); if($('#checkoutForm')){ fillProfile(); renderCart(); $('#checkoutForm').addEventListener('submit',placeOrder); } });
