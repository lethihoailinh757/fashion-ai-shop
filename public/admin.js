const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
let orders=[]; let pass='';
function statusActions(id){ return ['Đã xác nhận','Đang giao','Hoàn thành','Đã hủy'].map(s=>`<button class="btn ${s==='Đã hủy'?'danger':s==='Hoàn thành'?'ok':'secondary'}" onclick="updateStatus('${id}','${s}')">${s}</button>`).join(' '); }
function render(){
  const filter=document.getElementById('statusFilter').value; const list=filter?orders.filter(o=>o.status===filter):orders;
  document.getElementById('statTotal').textContent=orders.length; document.getElementById('statRevenue').textContent=fmt(orders.filter(o=>o.status!=='Đã hủy').reduce((s,o)=>s+o.total,0));
  document.getElementById('orders').innerHTML=list.length?list.map(o=>`<article class="order"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="font-size:22px">${o.id}</h2><p class="muted">${new Date(o.createdAt).toLocaleString('vi-VN')}</p></div><span class="status">${o.status}</span></div><p><b>Khách:</b> ${o.customer.fullName} · ${o.customer.phone} · ${o.customer.email||'Không có email'}</p><p><b>Địa chỉ:</b> ${o.customer.address}</p><div>${o.items.map(i=>`<p>• ${i.name} — size ${i.size}, ${i.color}, SL ${i.quantity}: <b>${fmt(i.price*i.quantity)}</b></p>`).join('')}</div><p><b>Thanh toán:</b> ${o.paymentMethod} · <b>Giao hàng:</b> ${o.shippingMethod}</p><p><b>Tổng:</b> <span class="price">${fmt(o.total)}</span></p><textarea class="input" id="note-${o.id}" placeholder="Ghi chú admin">${o.adminNote||''}</textarea><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${statusActions(o.id)}<button class="btn" onclick="saveNote('${o.id}')">Lưu ghi chú</button></div></article>`).join(''):'<div class="card"><p class="muted">Chưa có đơn hàng hoặc chưa đăng nhập admin.</p></div>';
}
async function loadOrders(){
  pass=document.getElementById('adminPass').value || localStorage.getItem('admin_pass') || ''; if(pass) localStorage.setItem('admin_pass',pass);
  const r=await fetch('/api/admin/orders',{headers:{'x-admin-password':pass}}); if(!r.ok){alert('Sai mật khẩu admin hoặc chưa nhập mật khẩu'); return;} orders=await r.json(); render();
}
async function updateStatus(id,status){
  const note=document.getElementById('note-'+id)?.value||''; const r=await fetch('/api/admin/orders/'+id,{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-password':pass},body:JSON.stringify({status,adminNote:note})}); if(!r.ok) return alert('Không cập nhật được'); await loadOrders();
}
async function saveNote(id){ const status=orders.find(o=>o.id===id)?.status || 'Mới đặt'; await updateStatus(id,status); }
document.getElementById('loginBtn').onclick=loadOrders; document.getElementById('refreshBtn').onclick=loadOrders; document.getElementById('statusFilter').onchange=render; document.getElementById('adminPass').value=localStorage.getItem('admin_pass')||''; if(document.getElementById('adminPass').value) loadOrders();
