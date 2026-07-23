import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // 🔒 Safe Import

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('guest');
  const [adminTab, setAdminTab] = useState<'products' | 'customers' | 'finance' | 'delivery'>('products');

  // Live States
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [deliveryBoys] = useState<any[]>([
    { id: 'd1', name: 'Suresh Verma', phone: '9811223344', assignedArea: 'Sector 14 & Green Park', totalDeliveries: 42, totalCollected: 3150 }
  ]);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; unit: string; icon: string; quantity: number }[]>(() => JSON.parse(localStorage.getItem('nr_cart') || '[]'));
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Auth States
  const [authRoleTab, setAuthRoleTab] = useState<'customer' | 'admin'>('customer');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const currentCustomer = user ? (customers.find(c => c.email === user.email || c.id === user.id)) : null;
  const [newProd, setNewProd] = useState({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' });

  // SUPABASE LIVE SYNC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        assignRoleByEmail(session.user.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        assignRoleByEmail(session.user.email);
      } else {
        setUser(null);
        setRole('guest');
      }
    });

    fetchLiveDatabaseData();

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const assignRoleByEmail = (email: string | undefined) => {
    if (!email) return;
    if (email === 'admin@nectarroots.com') setRole('admin');
    else if (email === 'delivery@nectarroots.com') setRole('delivery');
    else setRole('customer');
  };

  const fetchLiveDatabaseData = async () => {
    try {
      const { data: prodData, error: prodErr } = await supabase.from('products').select('*');
      if (prodErr) throw prodErr;
      if (prodData) setProducts(prodData.map((p) => ({ ...p, id: String(p.id) })));
      
      const { data: custData, error: custErr } = await supabase.from('customers').select('*');
      if (custErr) throw custErr;
      if (custData) {
        setCustomers(custData.map(c => ({ ...c, id: String(c.id), walletBalance: Number(c.wallet_balance ?? 0) })));
      }
      
      const { data: txData, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (txErr) throw txErr;
      if (txData) setTransactions(txData);

    } catch (err) { 
      console.error('Live Sync Error:', err); 
    }
  };

  useEffect(() => {
    localStorage.setItem('nr_cart', JSON.stringify(cart));
  }, [cart]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3500);
  };

  // REAL SUPABASE AUTHENTICATION
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setLoginError(error.message);
    } else {
      showToast('Secure Dashboard Accessed 👑');
      closeModal();
    }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!signupName || !signupPhone || !signupAddress || !emailInput || !passwordInput) {
      setLoginError('Please fill all required fields.'); 
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email: emailInput, password: passwordInput });
    if (error) {
      setLoginError(error.message);
    } else if (data.user) {
      const newCustomer = { 
        id: data.user.id, 
        name: signupName, 
        email: emailInput, 
        phone: signupPhone, 
        address: signupAddress, 
        wallet_balance: 0, 
        qrCode: `NR-${Math.floor(1000 + Math.random() * 9000)}` 
      };
      
      const { error: dbError } = await supabase.from('customers').insert([newCustomer]);
      if (dbError) {
        setLoginError('Auth successful, but database insert failed.');
        console.error(dbError);
        return;
      }
      
      fetchLiveDatabaseData(); 
      showToast('Account Created Successfully! 🎉');
      closeModal();
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) {
      setLoginError(error.message);
    } else { 
      showToast('Logged in successfully! 🔓'); 
      closeModal(); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole('guest');
    showToast('Securely logged out 👋');
  };

  const closeModal = () => {
    setShowLoginModal(false); 
    setAuthView('login'); 
    setAuthRoleTab('customer');
    setEmailInput(''); 
    setPasswordInput(''); 
    setSignupName(''); 
    setSignupPhone(''); 
    setSignupAddress(''); 
    setLoginError('');
  };

  // LIVE PRODUCT MANAGEMENT
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) return;

    const { data, error } = await supabase.from('products').insert([{ 
      name: newProd.name, 
      category: newProd.category, 
      price: Number(newProd.price), 
      original_price: Number(newProd.price) + 15, 
      unit: newProd.unit, 
      icon: '🌿', 
      tag: newProd.tag 
    }]).select();

    if (error) {
      alert("Database Insert Error: " + error.message);
      return;
    }

    if (data) {
      setProducts([...products, { ...data[0], id: String(data[0].id) }]);
      setNewProd({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' });
      showToast('Product published to live database!');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const { error } = await supabase.from('products').update({ 
      name: editingProduct.name, 
      price: editingProduct.price, 
      category: editingProduct.category, 
      unit: editingProduct.unit 
    }).eq('id', editingProduct.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      setProducts(products.map((p) => (String(p.id) === String(editingProduct.id) ? editingProduct : p)));
      setEditingProduct(null);
      showToast('Product updated successfully!');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert("Delete Failed: " + error.message);
    } else {
      setProducts(products.filter((p) => String(p.id) !== String(id)));
      showToast('Product deleted successfully!');
    }
  };

  // CART & CHECKOUT
  const handleAddToCart = (product: any) => {
    const existingIndex = cart.findIndex((item) => String(item.id) === String(product.id));
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { id: String(product.id), name: product.name, price: Number(product.price), unit: product.unit || 'Unit', icon: product.icon || '🌿', quantity: 1 }]);
    }
    showToast(`Added ${product.name}`);
  };

  const handleUpdateCartQuantity = (id: any, delta: number) => {
    const updatedCart = cart.map((item) => {
      if (String(item.id) === String(id)) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as typeof cart;
    setCart(updatedCart);
  };

  const getCartQuantity = (id: any) => {
    const item = cart.find((i) => String(i.id) === String(id));
    return item ? item.quantity : 0;
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Check if user is logged in
    if (!user || role === 'guest') {
      setShowCartModal(false); 
      setShowLoginModal(true); 
      showToast('Please login securely to checkout!', 'error'); 
      return;
    }

    // Find active customer profile
    const activeCustomer = customers.find(c => c.email === user.email || c.id === user.id);
    
    if (!activeCustomer) {
      fetchLiveDatabaseData();
      showToast('Syncing profile, please try again in a moment.', 'error');
      return;
    }

    const total = getCartTotal();
    const balance = Number(activeCustomer.wallet_balance || 0);

    if (balance < total) {
      showToast(`Insufficient Balance! Wallet: ₹${balance}, Required: ₹${total}`, 'error'); 
      return;
    }

    const newBalance = balance - total;
    const newTxs = cart.map((item) => ({ 
      customer_name: activeCustomer.name, 
      item: `${item.name} (${item.quantity} ${item.unit})`, 
      amount: item.price * item.quantity 
    }));

    try {
      const { error: walletErr } = await supabase.from('customers').update({ wallet_balance: newBalance }).eq('id', activeCustomer.id);
      if (walletErr) throw walletErr;

      const { error: txErr } = await supabase.from('transactions').insert(newTxs);
      if (txErr) throw txErr;

      fetchLiveDatabaseData(); 
      setCart([]);
      setShowCartModal(false);
      showToast(`Order Placed! ₹${total} deducted from wallet.`);
    } catch (e: any) { 
      alert("Checkout failed: " + e.message); 
    }
  };

  const handleRecharge = async (custId: string) => {
    const cust = customers.find(c => String(c.id) === String(custId));
    if (!cust) return;
    const rechargeAmount = 500;
    const newBal = Number(cust.wallet_balance || 0) + rechargeAmount;
    
    try { 
      const { error: updateErr } = await supabase.from('customers').update({ wallet_balance: newBal }).eq('id', custId); 
      if (updateErr) throw updateErr;

      const { error: txErr } = await supabase.from('transactions').insert([{ 
        customer_name: cust.name, 
        item: `Wallet Recharge (+₹${rechargeAmount})`, 
        amount: rechargeAmount 
      }]);
      if (txErr) throw txErr;

      fetchLiveDatabaseData();
      showToast(`Added ₹${rechargeAmount} to ${cust.name}'s wallet!`);
    } catch (e: any) { 
      alert("Recharge failed: " + e.message); 
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRecharges = transactions.filter(t => t.item?.includes('Recharge')).reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalSales = totalRevenue - totalRecharges;

  const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-slate-800 font-sans pb-28 antialiased selection:bg-emerald-100">
      {/* Dynamic Notifications */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-white font-medium text-xs max-w-xs transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-[#0A2E23]'}`}>
          {toast.msg}
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="bg-[#0A2E23] text-white px-4 py-3 shadow-md sticky top-0 z-20 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-300 via-emerald-400 to-emerald-700 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">🌿</div>
          <div className="shrink-0">
            <h1 className="font-bold text-base tracking-tight leading-none text-amber-100 whitespace-nowrap">Nectar Roots</h1>
            <p className="text-[10px] text-emerald-300/80 font-normal tracking-wide uppercase leading-none mt-1 whitespace-nowrap">
              {role === 'admin' ? 'Live Admin DB' : user ? `Hi, ${currentCustomer?.name?.split(' ')[0] || 'User'}` : 'Pure • Organic • Farm'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(role === 'guest' || role === 'customer') && (
            <button onClick={() => setShowCartModal(true)} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95">
              <span>🛒</span><span>Cart ({getCartCount()})</span>
            </button>
          )}

          {(!user || role === 'guest') && (
            <button onClick={() => setShowLoginModal(true)} className="bg-emerald-900/80 hover:bg-emerald-800 text-amber-200 font-semibold px-3 py-1.5 rounded-xl text-xs border border-emerald-700/50 transition whitespace-nowrap">
              Login / Signup
            </button>
          )}

          {user && role === 'customer' && (
            <>
              <button onClick={() => showToast('Wallet Gateway Opened')} className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-inner">
                <span>💳</span><span>₹{currentCustomer?.wallet_balance || 0}</span>
              </button>
              <button onClick={() => setShowQRModal(true)} className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 p-2 rounded-xl text-xs font-medium border border-emerald-700/50 transition">📱</button>
              <button onClick={handleLogout} className="bg-emerald-900 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-medium border border-emerald-700/50 transition">Logout</button>
            </>
          )}

          {user && (role === 'admin' || role === 'delivery') && (
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs whitespace-nowrap">
              Exit Portal
            </button>
          )}
        </div>
      </header>

      {/* ADMIN DASHBOARD COMPONENT */}
      {role === 'admin' && (
        <div className="max-w-4xl mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-[#0A2E23] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-800 flex justify-between items-center">
            <div>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">Master Dashboard</span>
              <h1 className="font-bold text-base sm:text-lg text-white">Nectar Roots Control Panel</h1>
              <p className="text-xs text-amber-300 font-bold">LIVE DATABASE SYNCED 🟢</p>
            </div>
            <div className="text-2xl">⚙️</div>
          </div>

          <div className="bg-slate-200/80 p-1 rounded-2xl border border-slate-300/60 grid grid-cols-2 sm:grid-cols-4 gap-1">
            {['customers', 'products', 'finance', 'delivery'].map((tab) => (
              <button key={tab} onClick={() => setAdminTab(tab as any)} className={`py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 ${adminTab === tab ? 'bg-white text-[#0A2E23] font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900 font-medium'}`}>
                <span>{tab === 'customers' ? '👥' : tab === 'products' ? '📦' : tab === 'finance' ? '📊' : '🛵'}</span>
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>

          {/* TAB: CUSTOMERS */}
          {adminTab === 'customers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-sm text-slate-900">👥 Live Customer Data</h2>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-100">Total: {customers.length}</span>
                </div>
                {customers.length === 0 && <div className="text-xs text-center py-5 text-slate-500">No customers found in database.</div>}
                <div className="space-y-2.5">
                  {customers.map((c) => (
                    <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                          <span>{c.name}</span><span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-md">QR: {c.qrCode || 'NR-101'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">📞 {c.phone} | ✉️ {c.email}</div>
                        <div className="text-[11px] text-slate-600 font-normal truncate max-w-xs">🏠 {c.address || 'No address provided'}</div>
                      </div>
                      <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-medium uppercase">Wallet</div>
                          <div className="text-sm font-bold text-[#0A2E23]">₹{c.wallet_balance ?? 0}</div>
                        </div>
                        <button onClick={() => handleRecharge(c.id)} className="bg-[#0A2E23] hover:bg-emerald-900 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition shrink-0">+ Add ₹500</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRODUCTS */}
          {adminTab === 'products' && (
            <div className="space-y-4">
              <form onSubmit={handleAddProduct} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="font-bold text-xs text-slate-900">+ Publish Live Product</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Product Title (e.g. Vedic Honey)" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal" required />
                  <input type="number" placeholder="Price (₹)" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal" required />
                  <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal">
                    <option value="Dairy">🥛 Dairy & Milk</option><option value="Eggs">🥚 Farm Eggs</option><option value="Ghee">🏺 Vedic Ghee</option><option value="Farm">🌱 Organic Farm</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#0A2E23] text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm">Save to Supabase Database</button>
              </form>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="font-bold text-xs text-slate-900 mb-2.5">📦 Live Database Inventory</h2>
                {products.length === 0 && <div className="text-xs text-center py-5 text-slate-500">Database is empty. Add a product above.</div>}
                <div className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl">{p.icon || '🌿'}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">{p.name}</div>
                          <div className="text-[11px] text-emerald-900 font-medium">₹{p.price} / {p.unit} | Category: {p.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEditingProduct(p)} className="bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-lg text-xs">✏️ Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 text-red-600 font-semibold px-2.5 py-1 rounded-lg text-xs">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FINANCIALS */}
          {adminTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Today Revenue', val: totalSales, tag: '🟢 Live Orders' },
                  { label: 'Weekly Income', val: totalSales * 5.2, tag: '📈 Estimated' },
                  { label: 'Monthly Total', val: totalSales * 22, tag: '📅 Current Month' },
                  { label: 'Yearly Revenue', val: totalSales * 240, tag: '📊 FY 2026' }
                ].map((s, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">{s.label}</div>
                    <div className="text-lg font-bold text-[#0A2E23] my-0.5">₹{s.val}</div>
                    <div className="text-[10px] text-emerald-800 font-medium">{s.tag}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-xs text-slate-900">🧾 Live Transaction Logs</h2>
                </div>
                {transactions.length === 0 && <div className="text-xs text-center py-5 text-slate-500">No transactions recorded yet.</div>}
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {transactions.map((t, idx) => (
                    <div key={t.id || idx} className="py-2.5 flex justify-between items-center text-xs gap-2">
                      <div>
                        <div className="font-semibold text-slate-800">{t.item}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Customer: {t.customer_name}</div>
                      </div>
                      <div className={`font-bold ${t.item?.includes('Recharge') ? 'text-emerald-700' : 'text-red-600'}`}>
                        {t.item?.includes('Recharge') ? `+₹${t.amount}` : `-₹${t.amount}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DELIVERY */}
          {adminTab === 'delivery' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="font-bold text-xs text-slate-900 mb-3">🛵 Registered Delivery Partners</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {deliveryBoys.map((d) => (
                    <div key={d.id} className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-1">
                      <div className="flex justify-between items-start">
                        <div><div className="font-semibold text-xs text-slate-900">{d.name}</div><div className="text-[11px] text-slate-500 font-normal">📞 {d.phone}</div></div>
                        <span className="bg-emerald-900 text-emerald-100 text-[10px] font-medium px-2 py-0.5 rounded-full">Active</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-normal">📍 Route: {d.assignedArea}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STOREFRONT COMPONENT */}
      {(role === 'guest' || role === 'customer') && (
        <main className="max-w-md mx-auto p-3.5 sm:p-4 space-y-4">
          <div className="bg-gradient-to-br from-[#0A2E23] via-[#0E3D2F] to-[#051C15] text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-emerald-800/50 relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                <span>✨ 100% Unadulterated Guarantee</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Pure A2 Milk & Organic Farm Produce</h2>
              <p className="text-xs text-emerald-200/90 mt-1 font-normal leading-relaxed">Untouched by human hands, chilled to 4°C within 1 hour of milking.</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Dairy', 'Eggs', 'Ghee', 'Farm'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${selectedCategory === cat ? 'bg-[#0A2E23] text-amber-200 border-[#0A2E23] shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'}`}>
                {cat === 'All' ? '🌟 All Items' : cat === 'Dairy' ? '🥛 Dairy & Milk' : cat === 'Eggs' ? '🥚 Farm Eggs' : cat === 'Ghee' ? '🏺 Vedic Ghee' : '🌱 Compost'}
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="text-4xl mb-2">🌱</div>
              <p className="text-sm font-semibold">Store is currently empty.</p>
              <p className="text-xs">Waiting for admin to add products to the database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const qtyInCart = getCartQuantity(p.id);
                return (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition duration-200 group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition shrink-0">{p.icon || '🌿'}</div>
                        <span className="bg-amber-50 text-amber-900 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200">★ {p.rating || '4.9'}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block mb-0.5">{p.tag || 'Pure'}</span>
                      <div className="font-semibold text-xs sm:text-sm text-slate-800 leading-snug line-clamp-2">{p.name}</div>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-sm font-bold text-[#0A2E23]">₹{p.price}</span><span className="text-[11px] font-normal text-slate-400">/ {p.unit}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      {qtyInCart > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50/90 rounded-xl p-1 border border-emerald-200">
                          <button onClick={() => handleUpdateCartQuantity(p.id, -1)} className="w-7 h-7 bg-white rounded-lg font-bold text-sm shadow-sm border border-slate-200 text-slate-800">-</button>
                          <span className="text-xs font-bold text-[#0A2E23] px-1">{qtyInCart}</span>
                          <button onClick={() => handleUpdateCartQuantity(p.id, 1)} className="w-7 h-7 bg-[#0A2E23] rounded-lg font-bold text-sm text-white shadow-sm">+</button>
                        </div>
                      ) : (
                        <button onClick={() => handleAddToCart(p)} className="w-full bg-[#0A2E23] hover:bg-emerald-900 text-white font-semibold py-2 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1 active:scale-95">
                          <span>🛒</span><span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* FLOATING CART BAR */}
      {cart.length > 0 && (role === 'guest' || role === 'customer') && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#0A2E23] text-white p-3 rounded-2xl shadow-2xl z-30 flex items-center justify-between border border-emerald-800/80 backdrop-blur-lg">
          <div className="flex items-center gap-2.5">
            <span className="bg-amber-400 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-xl">{getCartCount()} {getCartCount() === 1 ? 'Item' : 'Items'}</span>
            <div><div className="text-xs font-bold text-white">Total: ₹{getCartTotal()}</div></div>
          </div>
          <button onClick={() => setShowCartModal(true)} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md">
            <span>View Cart</span><span>➔</span>
          </button>
        </div>
      )}

      {/* SECURE FULL AUTH MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            {/* Top Toggle Selection */}
            <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => { setAuthRoleTab('customer'); setAuthView('login'); setLoginError(''); }} className={`w-1/2 py-2 text-xs font-bold rounded-lg transition ${authRoleTab === 'customer' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-500 hover:text-slate-700'}`}>👤 Customer</button>
              <button onClick={() => { setAuthRoleTab('admin'); setAuthView('login'); setLoginError(''); }} className={`w-1/2 py-2 text-xs font-bold rounded-lg transition ${authRoleTab === 'admin' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-500 hover:text-slate-700'}`}>🛡️ Admin</button>
            </div>

            {authRoleTab === 'admin' ? (
              /* ADMIN LOGIN */
              <>
                <h3 className="font-bold text-lg text-slate-900 mb-1">Portal Access 👑</h3>
                <p className="text-xs text-slate-500 mb-4">Enter secure credentials to access live dashboard.</p>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-700 block mb-1">Admin Email</label>
                    <input type="email" placeholder="admin@nectarroots.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-700 block mb-1">Password</label>
                    <input type="password" placeholder="••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required />
                  </div>
                  {loginError && <div className="text-[11px] text-red-600 font-semibold text-center">{loginError}</div>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={closeModal} className="w-1/3 bg-slate-100 text-slate-700 text-xs py-2.5 rounded-xl font-semibold">Cancel</button>
                    <button type="submit" className="w-2/3 bg-slate-900 text-white text-xs py-2.5 rounded-xl font-bold shadow-sm">Login Live ➔</button>
                  </div>
                </form>
              </>
            ) : (
              /* CUSTOMER LOGIN/SIGNUP */
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{authView === 'login' ? 'Welcome Back 👋' : 'Create Account 🌱'}</h3>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">{authView === 'login' ? 'Login to continue.' : 'Join for fresh organic delivery.'}</p>
                  </div>
                </div>

                <form className="space-y-3">
                  {authView === 'signup' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2"><input type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                      <div className="col-span-2"><input type="tel" placeholder="Mobile Number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                      <div className="col-span-2"><textarea placeholder="Delivery Address" value={signupAddress} onChange={(e) => setSignupAddress(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none h-14" /></div>
                    </div>
                  )}

                  <div><input type="email" placeholder="Email Address" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required /></div>
                  <div><input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl" required /></div>

                  {loginError && <div className="text-[11px] text-red-600 font-semibold text-center">{loginError}</div>}

                  {authView === 'login' ? (
                    <div className="pt-2 space-y-2.5">
                      <button type="button" onClick={handlePasswordLogin} className="w-full bg-[#0A2E23] text-white text-xs py-3 rounded-xl font-bold shadow-sm">Login with Password</button>
                      <p className="text-center text-[11px] text-slate-500 pt-2">New here? <button type="button" onClick={() => { setAuthView('signup'); setLoginError(''); }} className="font-bold text-[#0A2E23] hover:underline">Sign up now</button></p>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-3">
                      <button type="button" onClick={handleCustomerSignup} className="w-full bg-[#0A2E23] text-white text-xs py-3 rounded-xl font-bold shadow-sm">Create Account Securely</button>
                      <button type="button" onClick={() => { setAuthView('login'); setLoginError(''); }} className="w-full text-[11px] font-bold text-[#0A2E23] hover:underline">Back to Login</button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Edit Live Product</h3>
            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal" required />
              <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal" required />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingProduct(null)} className="w-1/2 bg-slate-100 text-slate-700 text-xs py-2 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="w-1/2 bg-[#0A2E23] text-white text-xs py-2 rounded-xl font-semibold shadow-sm">Save to DB</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CART MODAL */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-sm sm:max-w-md md:max-w-lg w-full shadow-xl border border-slate-100 max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><span>🛒 Shopping Cart</span></h3>
                <button onClick={() => setShowCartModal(false)} className="text-slate-400 font-bold hover:text-slate-700">✕</button>
              </div>
              
              {cart.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="text-5xl">🛒</div>
                  <p className="text-sm font-semibold text-slate-700">Your cart is empty!</p>
                  <p className="text-xs text-slate-500 pb-2">Looks like you haven't added anything yet.</p>
                  <button onClick={() => setShowCartModal(false)} className="bg-[#0A2E23] hover:bg-emerald-900 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-sm">
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200/80">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="font-semibold text-xs text-slate-800">{item.name}</div>
                          <div className="text-[11px] text-emerald-900 font-medium mt-0.5">
                            ₹{item.price} / {item.unit} <span className="text-slate-300 mx-1">|</span> 
                            <span className="font-bold text-[#0A2E23]">Total: ₹{item.price * item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-white rounded-lg font-bold text-sm shadow-sm border border-slate-200 flex items-center justify-center text-slate-700">-</button>
                        <span className="text-xs font-bold text-slate-900 w-3 text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-[#0A2E23] rounded-lg font-bold text-sm text-white shadow-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-100 mt-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-[#0A2E23] text-base">₹{getCartTotal()}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-[#0A2E23] hover:bg-emerald-900 text-amber-200 font-semibold py-3 rounded-xl text-xs shadow-md transition active:scale-95 mt-1">
                  Proceed to Checkout ➔
                </button>
                <p className="text-[10px] text-center text-slate-500 font-medium pt-1">
                  🔒 Wallet balance will be deducted securely.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900">Delivery Identifier QR</h3>
            <div className="p-4 bg-emerald-50 rounded-xl inline-block border border-emerald-200">
              <div className="text-5xl">🏁</div>
              <div className="text-xs font-mono font-bold mt-2 text-emerald-950">{currentCustomer?.qrCode}</div>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Show this QR code to the delivery agent for verification.</p>
            <button onClick={() => setShowQRModal(false)} className="w-full bg-[#0A2E23] text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}