/* iCAN API bridge for development. Token storage uses sessionStorage only for this local prototype.
   For production, replace browser-stored bearer tokens with a reviewed secure session strategy. */
(() => {
  const DEFAULT_API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:4000' : '';
  const apiBase = () => (window.ICAN_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, '');
  const state = { token: sessionStorage.getItem('ican_dev_access_token') || '', workspaceId: sessionStorage.getItem('ican_dev_workspace_id') || '', user: null, workspace: null };
  const $ = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    let response;
    try { response = await fetch(apiBase() + path, { ...options, headers }); }
    catch { throw new Error(`Cannot reach ${apiBase()}. Start the iCAN API and check its address.`); }
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
    return body;
  }
  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800);
  }
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `#icanApiButton{white-space:nowrap}#icanApiStatus{font-size:10px;color:#667085;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.api-dialog{padding:0;max-width:460px}.api-dialog .api-content{padding:18px 22px}.api-dialog input{width:100%;padding:11px;border:1px solid #d0d5dd;border-radius:8px}.api-dialog .api-field{margin:12px 0}.api-dialog label{display:block;font-size:11px;font-weight:700;margin-bottom:6px}.api-dialog .api-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.api-dialog .api-warning{font-size:11px;color:#8a4b08;background:#fff8e8;border:1px solid #f5d38b;padding:10px;border-radius:8px;line-height:1.5}`;
    document.head.append(style);
  }
  function addAuthUI() {
    const header = $('header'); if (!header || $('#icanApiButton')) return;
    const button = document.createElement('button'); button.id = 'icanApiButton'; button.className = 'btn'; button.textContent = state.token ? 'API connected' : 'Connect API';
    const status = document.createElement('span'); status.id = 'icanApiStatus'; status.textContent = state.token ? 'Checking session…' : 'Local demo mode';
    header.insertBefore(status, header.querySelector('.avatar'));
    header.insertBefore(button, status);
    button.addEventListener('click', () => openAuthDialog());
    const dialog = document.createElement('dialog'); dialog.id = 'icanAuthDialog'; dialog.className = 'api-dialog';
    dialog.innerHTML = `<div class="modalhead"><h2>Connect to your iCAN API</h2><button type="button" id="icanAuthClose" class="btn">Close</button></div><div class="api-content"><div class="api-warning">Development mode only. Use test data. This starter stores a short-lived bearer token in this browser tab's session storage; do not use it as a production session design.</div><div class="api-field"><label for="icanApiBase">API address</label><input id="icanApiBase" value="${escapeHtml(apiBase())}" autocomplete="url"></div><div class="api-field"><label for="icanAuthMode">Action</label><select id="icanAuthMode"><option value="login">Sign in</option><option value="register">Create account + workspace</option></select></div><div class="api-field" id="icanNameField" hidden><label for="icanAuthName">Your name</label><input id="icanAuthName" autocomplete="name"></div><div class="api-field" id="icanWorkspaceField" hidden><label for="icanWorkspaceName">Business / workspace name</label><input id="icanWorkspaceName" autocomplete="organization"></div><div class="api-field"><label for="icanAuthEmail">Email</label><input id="icanAuthEmail" type="email" autocomplete="email" required></div><div class="api-field"><label for="icanAuthPassword">Password</label><input id="icanAuthPassword" type="password" autocomplete="current-password" required></div><div class="api-actions"><button id="icanAuthSubmit" class="btn primary" type="button">Sign in</button><button id="icanAuthLogout" class="btn" type="button" ${state.token ? '' : 'hidden'}>Disconnect / sign out</button></div><p id="icanAuthMessage" role="status" class="muted"></p></div>`;
    document.body.append(dialog);
    $('#icanAuthClose').onclick = () => dialog.close();
    $('#icanAuthMode').onchange = updateMode;
    $('#icanAuthSubmit').onclick = submitAuth;
    $('#icanAuthLogout').onclick = logout;
    $('#icanApiBase').oninput = () => { window.ICAN_API_BASE = $('#icanApiBase').value.trim().replace(/\/$/, ''); };
    updateMode();
  }
  function updateMode() {
    const register = $('#icanAuthMode').value === 'register';
    $('#icanNameField').hidden = !register; $('#icanWorkspaceField').hidden = !register;
    $('#icanAuthSubmit').textContent = register ? 'Create account' : 'Sign in';
    $('#icanAuthPassword').autocomplete = register ? 'new-password' : 'current-password';
  }
  function openAuthDialog() { $('#icanAuthMessage').textContent = ''; $('#icanAuthDialog').showModal(); }
  function updateHeader() {
    const button = $('#icanApiButton'), status = $('#icanApiStatus');
    if (!button || !status) return;
    button.textContent = state.token ? 'Connected · Account' : 'Connect API';
    status.textContent = state.user ? `${state.user.name} · ${state.workspace?.name || 'Workspace'}` : (state.token ? 'API token active' : 'Local demo mode');
    const profile = document.querySelector('.profile');
    if (profile && state.user) profile.innerHTML = `🧑🏻‍💼 <span><b>${escapeHtml(state.user.name)}</b><small>${escapeHtml(state.workspace?.role || 'Workspace member')}</small></span>`;
    const footerStatus = document.querySelector('footer span'); if (footerStatus) footerStatus.textContent = state.token ? 'API connected · Tasks stored in PostgreSQL' : 'Local demo mode · Tasks saved in this browser';
  }
  function toLocalTask(task) {
    return { id: task.id, title: task.title, due: task.due_date || '', priority: ({low:'Low',normal:'Normal',high:'High',urgent:'Urgent'})[task.priority] || 'Normal', done: Boolean(task.completed_at), description: task.description || '' };
  }
  async function loadTasks() {
    if (!state.token || !state.workspaceId) return;
    const data = await request(`/api/tasks?workspaceId=${encodeURIComponent(state.workspaceId)}`);
    window.icanSetRemoteTasks?.(data.tasks || []);
  }
  const wid = () => { if (!state.token || !state.workspaceId) throw new Error('Connect to your iCAN workspace first.'); return state.workspaceId; };
  const idempotencyKey = (prefix='ican') => `${prefix}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  async function getCoreData() {
    const workspaceId = wid();
    const [pr, wh, loc, inv, sal, picks, moves] = await Promise.all([
      request(`/api/products?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/warehouses?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/warehouses/locations?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/inventory?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/sales?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/wms/pick-lists?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/wms/movements?workspaceId=${encodeURIComponent(workspaceId)}`)
    ]);
    const stockByProduct = new Map(), locationsByProduct = new Map();
    for (const row of (inv.inventory || [])) {
      const qty = Number(row.quantity || 0), available = qty - Number(row.reserved_quantity || 0);
      stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) || 0) + available);
      if (row.location_id && available > 0) { const list=locationsByProduct.get(row.product_id)||[]; list.push({locationId:row.location_id,available,locationCode:row.location_code,warehouseId:row.warehouse_id}); locationsByProduct.set(row.product_id,list); }
    }
    const data = {
      products: (pr.products || []).map(x => ({id:x.id,name:x.name,sku:x.sku,barcode:x.barcode||'',category:x.category||'',price:Number(x.selling_price),cost:Number(x.cost_price),stock:stockByProduct.get(x.id)||0,reorder:Number(x.reorder_level||0),icon:'◇'})),
      warehouses: (wh.warehouses || []).map(x => ({id:x.id,code:x.code,name:x.name,address:x.address,status:x.status})),
      locations: (loc.locations || []).map(x => { const rows=(inv.inventory||[]).filter(r=>r.location_id===x.id&&Number(r.quantity)>0); return {id:x.id,warehouseId:x.warehouse_id,code:x.code,zone:x.zone,type:x.location_type,productId:rows.length===1?rows[0].product_id:null,productLabel:rows.length===0?'Empty':rows.length===1?(pr.products||[]).find(p=>p.id===rows[0].product_id)?.name||'1 product':`${rows.length} products`,qty:rows.reduce((sum,r)=>sum+Number(r.quantity||0),0)}; }),
      inventory: inv.inventory || [], locationsByProduct,
      sales: (sal.sales || []).map(x => ({id:x.receipt_no,remoteId:x.id,customer:x.customer_name,date:x.created_at,items:0,total:Number(x.total_amount??x.total??0),status:x.status,paymentMethod:x.payment_method})),
      picklists: (picks.pickLists || []).map(x => ({id:x.id,productId:x.product_id||x.lines?.[0]?.product_id,qty:Number(x.quantity??x.lines?.[0]?.requested_quantity??0),status:({open:'Open',picking:'Picking',picked:'Picked',dispatched:'Dispatched',cancelled:'Cancelled'})[x.status]||x.status,created:x.created_at,reference:x.order_ref})),
      movements: (moves.movements || []).map(x=>({id:x.id,date:x.created_at,type:x.movement_type,productId:x.product_id,qty:Number(x.quantity_delta),from:x.from_code||'—',to:x.to_code||'—',reference:x.reference_id||x.reference_type||x.notes||x.id}))
    };
    window.icanSetRemoteCoreData?.(data);
    return data;
  }
  async function ensureDefaultLocation() {
    const workspaceId = wid();
    let wh = (await request(`/api/warehouses?workspaceId=${encodeURIComponent(workspaceId)}`)).warehouses || [];
    if (!wh.length) { const r = await request('/api/warehouses',{method:'POST',body:JSON.stringify({workspaceId,code:'MAIN',name:'Main Warehouse',address:'Default storage location'})}); wh=[r.warehouse]; }
    let locations = (await request(`/api/warehouses/locations?workspaceId=${encodeURIComponent(workspaceId)}`)).locations || [];
    let location = locations.find(x=>x.warehouse_id===wh[0].id);
    if (!location) { const r = await request('/api/warehouses/locations',{method:'POST',body:JSON.stringify({workspaceId,warehouseId:wh[0].id,code:'DEFAULT',zone:'A',locationType:'shelf'})}); location=r.location; }
    return {warehouse:wh[0],location};
  }
  async function createProduct(data) {
    const workspaceId=wid();
    const created=await request('/api/products',{method:'POST',body:JSON.stringify({workspaceId,sku:data.sku.trim(),barcode:data.barcode.trim()||null,name:data.name.trim(),category:data.category||'',sellingPrice:Number(data.price),costPrice:Number(data.cost||0),reorderLevel:Number(data.reorder||0)})});
    const product=created.product;
    if (Number(data.stock)>0) {
      const {location}=await ensureDefaultLocation();
      await request('/api/inventory/adjustments',{method:'POST',body:JSON.stringify({workspaceId,productId:product.id,locationId:location.id,quantityDelta:Number(data.stock),notes:'Opening stock entered during product creation',idempotencyKey:idempotencyKey('opening')})});
    }
    await getCoreData(); return product;
  }
  async function updateProduct(id,data) {
    const workspaceId=wid();
    const result=await request(`/api/products/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({workspaceId,sku:data.sku.trim(),name:data.name.trim(),barcode:data.barcode.trim()||null,category:data.category||'',sellingPrice:Number(data.price),costPrice:Number(data.cost||0),reorderLevel:Number(data.reorder||0)})});
    await getCoreData(); return result.product;
  }
  async function adjustStock(productId,delta,notes='Manual stock adjustment') {
    const workspaceId=wid(); const {location}=await ensureDefaultLocation();
    const result=await request('/api/inventory/adjustments',{method:'POST',body:JSON.stringify({workspaceId,productId,locationId:location.id,quantityDelta:Number(delta),notes,idempotencyKey:idempotencyKey('adjust')})});
    await getCoreData(); return result;
  }
  async function createLocation(data) { const workspaceId=wid(); const result=await request('/api/wms/locations',{method:'POST',body:JSON.stringify({workspaceId,warehouseId:data.warehouseId,code:data.code.trim(),zone:data.zone||'',locationType:({'Shelf':'shelf','Bin':'bin','Rack':'rack','Floor':'floor','Cold storage':'cold_storage','Staging':'staging','Receiving':'receiving','Dispatch':'dispatch'})[data.type]||'shelf',productId:data.productId||null,quantity:Number(data.quantity||0)})}); await getCoreData(); return result.location; }
  async function createWarehouse(data) {
    const workspaceId=wid(); const result=await request('/api/warehouses',{method:'POST',body:JSON.stringify({workspaceId,code:data.code.trim(),name:data.name.trim(),address:data.address||''})});
    await getCoreData(); return result.warehouse;
  }
  async function receiveStock({productId,locationId,quantity,reference,supplierName=''}) { const workspaceId=wid(); const result=await request('/api/wms/receipts',{method:'POST',body:JSON.stringify({workspaceId,productId,locationId,quantity:Number(quantity),reference:reference.trim(),supplierName,idempotencyKey:idempotencyKey('receipt')})}); await getCoreData(); return result; }
  async function transferStock({productId,fromLocationId,toLocationId,quantity,reference=''}) { const workspaceId=wid(); const result=await request('/api/wms/transfers',{method:'POST',body:JSON.stringify({workspaceId,productId,fromLocationId,toLocationId,quantity:Number(quantity),reference:reference||`MOVE-${Date.now()}`,idempotencyKey:idempotencyKey('transfer')})}); await getCoreData(); return result; }
  async function cycleCount({productId,locationId,countedQuantity,notes=''}) { const workspaceId=wid(); const result=await request('/api/wms/cycle-counts',{method:'POST',body:JSON.stringify({workspaceId,productId,locationId,countedQuantity:Number(countedQuantity),notes,idempotencyKey:idempotencyKey('count')})}); await getCoreData(); return result; }
  async function createPickList({productId,locationId,quantity,orderRef}) { const workspaceId=wid(); const result=await request('/api/wms/pick-lists',{method:'POST',body:JSON.stringify({workspaceId,productId,locationId,quantity:Number(quantity),orderRef,idempotencyKey:idempotencyKey('pick')})}); await getCoreData(); return result; }
  async function dispatchPickList(id) { const workspaceId=wid(); const result=await request(`/api/wms/pick-lists/${encodeURIComponent(id)}/dispatch`,{method:'POST',body:JSON.stringify({workspaceId,idempotencyKey:idempotencyKey('dispatch')})}); await getCoreData(); return result; }
  async function getBusinessData() {
    const workspaceId=wid();
    const [cr,su,po,ex,fs]=await Promise.all([
      request(`/api/customers?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/suppliers?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/purchase-orders?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/expenses?workspaceId=${encodeURIComponent(workspaceId)}`),
      request(`/api/finance/summary?workspaceId=${encodeURIComponent(workspaceId)}`)
    ]);
    const data={customers:(cr.customers||[]).map(x=>({id:x.id,name:x.name,email:x.email,phone:x.phone,spent:Number(x.lifetime_spend||0),orderCount:Number(x.order_count||0),notes:x.notes||''})),suppliers:(su.suppliers||[]).map(x=>({id:x.id,name:x.name,contact:x.contact_name,email:x.email,phone:x.phone,address:x.address,paymentTerms:x.payment_terms,notes:x.notes})),purchaseOrders:(po.purchaseOrders||[]).map(x=>({id:x.id,orderNumber:x.order_number,status:x.status,supplierId:x.supplier_id,supplier:x.supplier_name,warehouseId:x.warehouse_id,warehouse:x.warehouse_name,subtotal:Number(x.subtotal||0),orderedAt:x.ordered_at,notes:x.notes,lines:x.lines||[]})),expenses:(ex.expenses||[]).map(x=>({id:x.id,date:String(x.expense_date).slice(0,10),category:x.category,description:x.description,amount:Number(x.amount),reference:x.reference,status:x.status})),financeSummary:fs.summary||null};
    window.icanSetRemoteCRMData?.(data); window.icanSetRemoteFinanceData?.(data); return data;
  }
  async function createCustomer(data) { const r=await request('/api/customers',{method:'POST',body:JSON.stringify({workspaceId:wid(),name:data.name.trim(),email:data.email||'',phone:data.phone||'',notes:data.notes||''})}); await getBusinessData(); return r.customer; }
  async function createExpense(data) { const r=await request('/api/expenses',{method:'POST',body:JSON.stringify({workspaceId:wid(),date:data.date,category:data.category,description:data.description,amount:Number(data.amount),currency:'PHP',reference:data.reference||''})}); await getBusinessData(); return r.expense; }
  async function createSupplier(data) { const r=await request('/api/suppliers',{method:'POST',body:JSON.stringify({workspaceId:wid(),name:data.name.trim(),contactName:data.contact||'',email:data.email||'',phone:data.phone||'',address:data.address||'',paymentTerms:data.paymentTerms||'',notes:data.notes||''})}); await getBusinessData(); return r.supplier; }
  async function createPurchaseOrder(data) { const r=await request('/api/purchase-orders',{method:'POST',body:JSON.stringify({workspaceId:wid(),supplierId:data.supplierId,warehouseId:data.warehouseId,orderNumber:data.orderNumber,notes:data.notes||'',currency:'PHP',lines:[{productId:data.productId,quantity:Number(data.quantity),unitCost:Number(data.unitCost)}]})}); await getBusinessData(); return r.purchaseOrder; }
  async function cancelPurchaseOrder(id) { const r=await request(`/api/purchase-orders/${encodeURIComponent(id)}/cancel`,{method:'POST',body:JSON.stringify({workspaceId:wid()})}); await getBusinessData(); return r; }
  async function receivePurchaseOrder(data) { const r=await request(`/api/purchase-orders/${encodeURIComponent(data.orderId)}/receive`,{method:'POST',body:JSON.stringify({workspaceId:wid(),locationId:data.locationId,reference:data.reference,lines:[{lineId:data.lineId,quantity:Number(data.quantity)}],idempotencyKey:idempotencyKey('po-receive')})}); await getCoreData(); await getBusinessData(); return r; }
  async function checkoutSale({items,customerName,customerId,paymentMethod}) {
    const workspaceId=wid(); const core=await getCoreData();
    const lines=[]; for(const item of items){const remote=core.products.find(p=>String(p.id)===String(item.id));const bins=(core.locationsByProduct.get(String(item.id))||[]).slice().sort((a,b)=>b.available-a.available);if(!remote)throw new Error(`Product ${item.name} is not in the connected catalog.`);let remaining=Number(item.qty);for(const bin of bins){if(remaining<=0)break;const quantity=Math.min(remaining,bin.available);if(quantity>0)lines.push({productId:String(item.id),locationId:bin.locationId,quantity});remaining-=quantity;}if(remaining>0)throw new Error(`Insufficient warehouse stock for ${item.name}.`);}
    const result=await request('/api/sales/checkout',{method:'POST',body:JSON.stringify({workspaceId,idempotencyKey:idempotencyKey('sale'),customerName:customerName||'Walk-in customer',customerId:customerId||null,paymentMethod:({Cash:'cash',Card:'card'})[paymentMethod]||'other',items:lines})});
    await getCoreData(); return result;
  }
  async function submitAuth() {
    const message = $('#icanAuthMessage'); const base = $('#icanApiBase').value.trim().replace(/\/$/, '');
    if (!base) { message.textContent = 'Enter the API address.'; return; }
    window.ICAN_API_BASE = base;
    const mode = $('#icanAuthMode').value;
    const email = $('#icanAuthEmail').value.trim(), password = $('#icanAuthPassword').value;
    const payload = { email, password };
    if (mode === 'register') { payload.name = $('#icanAuthName').value.trim(); payload.workspaceName = $('#icanWorkspaceName').value.trim(); if (password.length < 12) { message.textContent = 'For registration, use a unique password with at least 12 characters.'; return; } }
    if (!email || !password || (mode === 'register' && (!payload.name || !payload.workspaceName))) { message.textContent = 'Complete all required fields.'; return; }
    const submit = $('#icanAuthSubmit'); submit.disabled = true; message.textContent = 'Connecting…';
    try {
      const result = await request(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload), headers: {} });
      state.token = result.accessToken || result.token; state.user = result.user;
      if (mode === 'register') state.workspace = { ...result.workspace, role: 'owner' };
      else {
        const me = await request('/api/auth/me'); state.user = me.user; state.workspace = me.workspaces?.[0] || null;
      }
      state.workspaceId = state.workspace?.id || '';
      if (!state.workspaceId) throw new Error('No workspace was returned for this account.');
      sessionStorage.setItem('ican_dev_access_token', state.token); sessionStorage.setItem('ican_dev_workspace_id', state.workspaceId);
      $('#icanAuthLogout').hidden = false; $('#icanAuthDialog').close(); updateHeader(); await loadTasks(); await getCoreData(); await getBusinessData(); toast('Connected. Tasks and core inventory data loaded from PostgreSQL.');
    } catch (error) { message.textContent = error.message; }
    finally { submit.disabled = false; }
  }
  async function logout() {
    state.token = ''; state.workspaceId = ''; state.user = null; state.workspace = null;
    sessionStorage.removeItem('ican_dev_access_token'); sessionStorage.removeItem('ican_dev_workspace_id');
    updateHeader(); $('#icanAuthDialog').close(); toast('Disconnected. Demo data remains local.');
  }
  async function restoreSession() {
    if (!state.token) { updateHeader(); return; }
    try { const me = await request('/api/auth/me'); state.user = me.user; state.workspace = me.workspaces?.find(w => w.id === state.workspaceId) || me.workspaces?.[0] || null; state.workspaceId = state.workspace?.id || ''; await loadTasks(); await getCoreData(); await getBusinessData(); }
    catch { state.token = ''; state.workspaceId = ''; sessionStorage.removeItem('ican_dev_access_token'); sessionStorage.removeItem('ican_dev_workspace_id'); }
    updateHeader();
  }
  const api = {
    isConnected: () => Boolean(state.token && state.workspaceId),
    aiWorkspaceId: () => state.workspaceId,
    async askAIRole(role, message, context = '') {
      if (!state.token || !state.workspaceId) throw new Error('Connect API and sign in to your workspace before using Mistral AI.');
      return request('/api/ai/ask', { method: 'POST', body: JSON.stringify({ workspaceId: state.workspaceId, role, message, context }) });
    },
    async getAIRoles() { return request('/api/ai/roles'); },
    toLocalTask,
    getCoreData, getBusinessData, createCustomer, createSupplier, createExpense, createPurchaseOrder, cancelPurchaseOrder, receivePurchaseOrder, createProduct, updateProduct, adjustStock, createWarehouse, createLocation, checkoutSale, receiveStock, transferStock, cycleCount, createPickList, dispatchPickList,
    async createSubscriptionCheckout(planId, interval = 'monthly') {
      if (!state.token || !state.workspaceId) throw new Error('Connect API and choose a workspace first.');
      const idempotencyKey = (window.crypto?.randomUUID ? window.crypto.randomUUID() : `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      return request('/api/payments/subscription/checkout', { method: 'POST', body: JSON.stringify({ workspaceId: state.workspaceId, planId, interval, idempotencyKey }) });
    },
    async loadPaymentStatus() {
      if (!state.token || !state.workspaceId) throw new Error('Connect API and choose a workspace first.');
      const result = await request(`/api/payments/status?workspaceId=${encodeURIComponent(state.workspaceId)}`);
      const current = document.querySelector('#icanPlanCurrent'); if (current) current.textContent = result.subscription?.plan_id || 'free';
      const status = document.querySelector('#icanPlanStatus'); if (status) status.textContent = result.subscription?.status || 'free';
      const history = document.querySelector('#icanPaymentHistory');
      if (history) history.innerHTML = (result.transactions || []).map(x => `<div class="activity"><div class="details"><b>${escapeHtml(x.purpose === 'ican_subscription' ? `Subscription · ${x.plan_id || ''}` : 'Merchant order')}</b><small>${escapeHtml(x.status)} · ${escapeHtml(new Date(x.created_at).toLocaleString())}</small></div><strong>${escapeHtml(x.currency)} ${Number(x.amount || 0).toLocaleString()}</strong></div>`).join('') || '<p class="muted">No transactions yet.</p>';
      return result;
    },
    async createMerchantCheckout(data) {
      if (!state.token || !state.workspaceId) throw new Error('Connect API and choose a workspace first.');
      return request('/api/payments/merchant/checkout', { method: 'POST', body: JSON.stringify({ ...data, workspaceId: state.workspaceId }) });
    },
    async createTask(data) {
      const priority = ({Low:'low',Normal:'normal',High:'high',Urgent:'urgent'})[data.priority] || 'normal';
      const result = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ workspaceId: state.workspaceId, title: data.title, dueDate: data.due || null, priority }) });
      return result.task;
    },
    async updateTask(id, patch) { const result = await request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ workspaceId: state.workspaceId, ...patch }) }); return result.task; },
    async deleteTask(id) { await request(`/api/tasks/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(state.workspaceId)}`, { method: 'DELETE' }); }
  };
  window.icanBackend = api;
  addStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { addAuthUI(); restoreSession(); });
  else { addAuthUI(); restoreSession(); }
})();
