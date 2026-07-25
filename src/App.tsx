import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('guest');
  const [adminTab, setAdminTab] = useState<
    'products' | 'customers' | 'finance' | 'delivery' | 'paused'
  >('products');

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  const [cart, setCart] = useState<any[]>(() => JSON.parse(localStorage.getItem('nr_cart') || '[]'));
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false); 
  const [showWalletModal, setShowWalletModal] = useState(false); 
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false); 
  const [viewProduct, setViewProduct] = useState<any>(null); 
  
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null); 
  const [selectedSubProduct, setSelectedSubProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [deliveryTab, setDeliveryTab] = useState<'pending' | 'history'>('pending');
  const [currentBanner, setCurrentBanner] = useState(0);

  const [subQty, setSubQty] = useState(1);
  const [subFreq, setSubFreq] = useState<'Daily' | 'Alternate Days'>('Daily');
  const [subPayType, setSubPayType] = useState<'auto_deduct' | 'scan_deduct'>('scan_deduct');

  const [authRoleTab, setAuthRoleTab] = useState<'customer' | 'admin'>('customer');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const currentCustomer = user ? customers.find((c) => c.email === user.email || c.id === user.id) : null;

  const [newProd, setNewProd] = useState({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); assignRoleByEmail(session.user.email); }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setUser(session.user); assignRoleByEmail(session.user.email); }
      else { setUser(null); setRole('guest'); }
    });
    fetchLiveDatabaseData();

    const bannerTimer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % 2); 
    }, 4000);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(bannerTimer);
    };
  }, []);

  const assignRoleByEmail = (email: string | undefined) => {
    if (!email) return;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail === 'admin@nectarroots.com') setRole('admin');
    else if (lowerEmail.includes('delivery') || lowerEmail.includes('agent')) setRole('delivery');
    else setRole('customer');
  };

  const fetchLiveDatabaseData = async () => {
    try {
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) setProducts(prodData.map((p) => ({ ...p, id: String(p.id) })));
      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) setCustomers(custData.map((c) => ({ ...c, id: String(c.id), walletBalance: Number(c.wallet_balance ?? 0) })));
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (txData) setTransactions(txData);
      const { data: subData } = await supabase.from('subscriptions').select('*');
      if (subData) setSubscriptions(subData);
    } catch (err) { console.error('Live Sync Error:', err); }
  };

  useEffect(() => { localStorage.setItem('nr_cart', JSON.stringify(cart)); }, [cart]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3500);
  };

  const sendEmailAlert = async (subject: string, message: string, customerEmail: string = 'admin@nectarroots.com') => {
    const myAccessKey = '6c022681-4948-4be2-973e-3548e836739f'; 
    try {
      await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ access_key: myAccessKey, subject, from_name: 'Nectar Roots', email: customerEmail, message }) });
    } catch (error) { console.error('Email Error:', error); }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setLoginError(error.message); else { showToast('Secure Dashboard Accessed 👑'); closeModal(); }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    if (!signupName || !signupPhone || !signupAddress || !emailInput || !passwordInput) return setLoginError('Fill all fields.');
    const { data, error } = await supabase.auth.signUp({ email: emailInput, password: passwordInput });
    if (error) setLoginError(error.message);
    else if (data.user) {
      const newCustomer = { id: data.user.id, name: signupName, email: emailInput, phone: signupPhone, address: signupAddress, wallet_balance: 0, qrCode: `NR-${Math.floor(1000 + Math.random() * 9000)}` };
      await supabase.from('customers').insert([newCustomer]);
      fetchLiveDatabaseData(); showToast('Account Created! 🎉'); closeModal();
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setLoginError(error.message); else { showToast('Logged in successfully! 🔓'); closeModal(); }
  };

  const handleForgotPassword = async () => {
    if (!emailInput) return setLoginError('Enter email to reset.');
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput);
    if (error) setLoginError(error.message); else { showToast('Reset link sent! 📧'); setLoginError(''); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setRole('guest'); showToast('Securely logged out 👋'); };

  const closeModal = () => {
    setShowLoginModal(false); setAuthView('login'); setAuthRoleTab('customer');
    setEmailInput(''); setPasswordInput(''); setSignupName(''); setSignupPhone(''); setSignupAddress(''); setLoginError('');
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || role === 'guest') { setShowSubscribeModal(false); setShowLoginModal(true); return showToast('Please login!', 'error'); }
    if (!selectedSubProduct || !currentCustomer) return;
    try {
      const newSub = { customer_id: currentCustomer.id, customer_name: currentCustomer.name, product_name: selectedSubProduct.name, quantity: subQty, price: selectedSubProduct.price * subQty, frequency: subFreq, payment_type: subPayType, status: 'Active' };
      await supabase.from('subscriptions').insert([newSub]);
      fetchLiveDatabaseData(); setShowSubscribeModal(false); showToast(`Subscription Started! 📅`);
      sendEmailAlert(`📅 New Subscription: ${currentCustomer.name}`, `${currentCustomer.name} subscribed to ${selectedSubProduct.name}.`);
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleTogglePause = async (subId: string, currentStatus: string, productName: string) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    try {
      const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', subId);
      if (error) throw error;
      fetchLiveDatabaseData();
      showToast(newStatus === 'Paused' ? `Delivery Paused for ${productName} 🌴` : `Delivery Resumed for ${productName} 🚀`);
      if (newStatus === 'Paused') sendEmailAlert(`⏸️ Delivery Paused by ${currentCustomer?.name}`, `${currentCustomer?.name} has paused their subscription for ${productName}. Please check Admin Portal.`);
    } catch (err: any) { alert('Pause Error: ' + err.message); }
  };

  const handleMarkDelivered = async (delivery: any) => {
    if (!delivery || !delivery.cust) return;
    const cust = delivery.cust;
    const amountToDeduct = Number(delivery.price);
    try {
      if (delivery.payment_type === 'scan_deduct') {
        if (Number(cust.wallet_balance) < amountToDeduct) return showToast(`Failed: Low balance! (₹${cust.wallet_balance})`, 'error');
        await supabase.from('customers').update({ wallet_balance: Number(cust.wallet_balance) - amountToDeduct }).eq('id', cust.id);
        await supabase.from('transactions').insert([{ customer_name: cust.name, item: `Delivery: ${delivery.product_name} [Agent: ${user.email}]`, amount: amountToDeduct }]);
      } else {
        await supabase.from('transactions').insert([{ customer_name: cust.name, item: `Delivery (Auto-paid): ${delivery.product_name} [Agent: ${user.email}]`, amount: 0 }]);
      }
      fetchLiveDatabaseData(); setShowScannerModal(false); showToast(`Delivered to ${cust.name}! ✅`);
    } catch (err: any) { alert("Delivery Error: " + err.message); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) return;
    const { data } = await supabase.from('products').insert([{ name: newProd.name, category: newProd.category, price: Number(newProd.price), original_price: Number(newProd.price) + 15, unit: newProd.unit, icon: '🌿', tag: newProd.tag }]).select();
    if (data) { setProducts([...products, { ...data[0], id: String(data[0].id) }]); setNewProd({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' }); showToast('Product published!'); }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingProduct) return;
    await supabase.from('products').update({ name: editingProduct.name, price: editingProduct.price, category: editingProduct.category }).eq('id', editingProduct.id);
    setProducts(products.map((p) => String(p.id) === String(editingProduct.id) ? editingProduct : p)); setEditingProduct(null); showToast('Product updated!');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id); setProducts(products.filter((p) => String(p.id) !== String(id))); showToast('Product deleted!');
  };

  const handleAddToCart = (product: any) => {
    const existingIndex = cart.findIndex((item) => String(item.id) === String(product.id));
    if (existingIndex > -1) { const updatedCart = [...cart]; updatedCart[existingIndex].quantity += 1; setCart(updatedCart); } 
    else setCart([...cart, { id: String(product.id), name: product.name, price: Number(product.price), unit: product.unit || 'Unit', icon: product.icon || '🌿', quantity: 1 }]);
    showToast(`Added ${product.name}`);
  };

  const handleUpdateCartQuantity = (id: any, delta: number) => setCart(cart.map((item) => String(item.id) === String(id) ? { ...item, quantity: item.quantity + delta > 0 ? item.quantity + delta : 0 } : item).filter(i => i.quantity > 0) as any);
  const getCartQuantity = (id: any) => cart.find((i) => String(i.id) === String(id))?.quantity || 0;
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!user || role === 'guest') { setShowCartModal(false); setShowLoginModal(true); return showToast('Please login to checkout!', 'error'); }
    const activeCustomer = customers.find((c) => c.email === user.email || c.id === user.id);
    if (!activeCustomer) return showToast('Syncing profile, please try again.', 'error');
    const total = getCartTotal(); const balance = Number(activeCustomer.wallet_balance || 0);
    if (balance < total) return showToast(`Low Balance! Wallet: ₹${balance}`, 'error');

    try {
      await supabase.from('customers').update({ wallet_balance: balance - total }).eq('id', activeCustomer.id);
      const newTxs = cart.map((item) => ({ customer_name: activeCustomer.name, item: `Store Order: ${item.name}`, amount: item.price * item.quantity }));
      await supabase.from('transactions').insert(newTxs);
      fetchLiveDatabaseData(); setCart([]); setShowCartModal(false); showToast(`Order Placed! ₹${total} deducted.`);
    } catch (e: any) { alert('Checkout failed: ' + e.message); }
  };

  const handleRecharge = async (custId: string) => {
    const cust = customers.find((c) => String(c.id) === String(custId));
    if (!cust) return;
    try {
      await supabase.from('customers').update({ wallet_balance: Number(cust.wallet_balance || 0) + 500 }).eq('id', custId);
      await supabase.from('transactions').insert([{ customer_name: cust.name, item: `Wallet Recharge 🟢`, amount: 500 }]);
      fetchLiveDatabaseData(); showToast(`Added ₹500 to ${cust.name}'s wallet!`);
    } catch (e: any) { alert('Recharge failed: ' + e.message); }
  };

  const agentTransactions = transactions.filter(t => t.item?.includes(`[Agent: ${user?.email}]`));
  const agentTotalCollected = agentTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRecharges = transactions.filter((t) => t.item?.includes('Recharge')).reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalSales = totalRevenue - totalRecharges;
  const filteredProducts = selectedCategory === 'All' ? products : products.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());

  const banners = [
    { title: "Pure A2 Milk & Farm Produce", sub: "Straight from soil to your soul. 🌾", bg: "from-[#1E3F2D] to-[#2C523D]", icon: "🏺" },
    { title: "Recharge Wallet & Subscribe", sub: "100% Contactless Daily Service. 🛵", bg: "from-[#B5651D] to-[#965216]", icon: "💳" }
  ];

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#2D241E] font-sans pb-28 antialiased selection:bg-[#EBE5D9] relative">
      
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-white font-medium text-xs max-w-xs transition-all border ${toast.type === 'error' ? 'bg-[#8B0000] border-[#5C0000]' : 'bg-[#1E3F2D] border-[#152E20]'}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-[#1E3F2D] text-[#F4F0E6] px-3 sm:px-4 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.1)] sticky top-0 z-20 flex justify-between items-center backdrop-blur-md border-b border-[#152E20] gap-2">
        <div className="flex items-center gap-2 min-w-0"> 
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2C523D] border border-[#3A6B50] rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">🌿</div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-[#F4F0E6] truncate">Nectar Roots</h1>
            <p className="text-[9px] sm:text-[10px] text-[#B5651D] font-bold tracking-widest uppercase leading-none mt-1 truncate">
              {role === 'admin' ? 'Live Admin DB' : role === 'delivery' ? `Agent: ${user?.email?.split('@')[0]}` : user ? `Hi, ${currentCustomer?.name?.split(' ')[0] || 'User'}` : 'Pure • Organic • Farm'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(role === 'guest' || role === 'customer') && (
            <button onClick={() => setShowCartModal(true)} className="bg-[#B5651D] hover:bg-[#965216] text-white font-bold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center gap-1 shadow-md shadow-[#B5651D]/20 transition active:scale-95">
              <span>🛒</span><span className="hidden sm:inline">Cart</span><span>({getCartCount()})</span>
            </button>
          )}
          
          {(!user || role === 'guest') && (
            <button onClick={() => setShowLoginModal(true)} className="bg-[#F8F5EE]/10 hover:bg-[#F8F5EE]/20 border border-[#F8F5EE]/20 text-[#F4F0E6] font-semibold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs transition"><span className="hidden sm:inline">Login / Signup</span><span className="sm:hidden block">Login</span></button>
          )}

          {user && role === 'customer' && (
            <button onClick={() => setShowWalletModal(true)} className="bg-[#2C523D] hover:bg-[#3A6B50] border border-[#3A6B50] text-[#F4F0E6] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-inner transition active:scale-95">
              <span>💳</span><span>₹{currentCustomer?.wallet_balance || 0}</span>
            </button>
          )}
          {user && (role === 'admin' || role === 'delivery') && (<button onClick={handleLogout} className="bg-[#8B0000] hover:bg-[#5C0000] text-white font-bold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs transition border border-[#5C0000]">Exit</button>)}
        </div>
      </header>

      {role === 'admin' && (
        <div className="max-w-4xl mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-gradient-to-br from-[#1E3F2D] to-[#2C523D] text-[#F4F0E6] p-4 sm:p-5 rounded-3xl shadow-lg border border-[#152E20] flex justify-between items-center">
            <div><span className="bg-[#B5651D]/20 text-[#D79A5E] border border-[#B5651D]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mb-1 inline-block">Master Dashboard</span><h1 className="font-extrabold text-base sm:text-lg text-white">Control Panel</h1></div><div className="text-3xl opacity-80">⚙️</div>
          </div>
          
          <div className="bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm flex overflow-x-auto no-scrollbar gap-1.5">
            {['customers', 'products', 'finance', 'delivery', 'paused'].map((tab) => (
              <button key={tab} onClick={() => setAdminTab(tab as any)} className={`py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${adminTab === tab ? 'bg-[#1E3F2D] text-[#F4F0E6] font-bold shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1] font-semibold'} capitalize`}>
                <span>{tab === 'customers' ? '👥' : tab === 'products' ? '📦' : tab === 'finance' ? '📊' : tab === 'paused' ? '⏸️' : '🛵'}</span> {tab}
              </button>
            ))}
          </div>

          {adminTab === 'customers' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-4">👥 Live Customer Data</h2>
              {customers.map((c) => (
                <div key={c.id} className="p-4 bg-[#F8F5EE] rounded-2xl border border-[#EBE5D9] mb-3 flex justify-between items-center"><div className="w-2/3"><div className="font-extrabold text-xs text-[#2D241E] truncate">{c.name}</div><div className="text-[11px] text-[#796C61] mt-1">📞 {c.phone}</div><div className="text-[11px] font-extrabold text-[#B5651D] mt-1">Wallet: ₹{c.wallet_balance || 0}</div></div><button onClick={() => handleRecharge(c.id)} className="bg-[#1E3F2D] text-[#F4F0E6] text-xs px-3 py-2 rounded-xl font-bold">+ ₹500</button></div>
              ))}
            </div>
          )}

          {adminTab === 'products' && (
            <div className="space-y-4">
              <form onSubmit={handleAddProduct} className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm space-y-4">
                <h2 className="font-bold text-sm text-[#2D241E]">+ Publish Product</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Title" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] rounded-xl border border-[#EBE5D9]" required />
                  <input type="number" placeholder="Price" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] rounded-xl border border-[#EBE5D9]" required />
                  <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] rounded-xl border border-[#EBE5D9]">
                    <option value="Dairy">Dairy</option><option value="Eggs">Eggs</option><option value="Ghee">Ghee</option><option value="Farm">Farm</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#1E3F2D] text-white text-xs py-3 rounded-xl font-bold">Save to Database</button>
              </form>
              
              <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
                <h2 className="font-bold text-sm text-[#2D241E] mb-4">📦 Live Database Inventory</h2>
                {products.length === 0 && <div className="text-xs text-center py-8 text-[#796C61] font-medium">Database is empty. Add a product above.</div>}
                <div className="divide-y divide-[#EBE5D9]">
                  {products.map((p) => (
                    <div key={p.id} className="py-3 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#F0EBE1] rounded-xl flex items-center justify-center text-xl border border-[#EBE5D9] shrink-0">{p.icon || '🌿'}</div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#2D241E] truncate">{p.name}</div>
                          <div className="text-[11px] text-[#B5651D] font-extrabold mt-0.5">₹{p.price} <span className="text-[#796C61] font-medium">/ {p.unit}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEditingProduct(p)} className="bg-[#F0EBE1] hover:bg-[#EBE5D9] text-[#2D241E] font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition">✏️ Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-[#8B0000]/10 hover:bg-[#8B0000]/20 text-[#8B0000] font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'paused' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-4">⏸️ Vacation Mode (Paused Subs)</h2>
              {subscriptions.filter(s => s.status === 'Paused').length === 0 && <div className="text-xs text-center py-6 text-[#796C61] font-medium">No deliveries are paused right now.</div>}
              {subscriptions.filter(s => s.status === 'Paused').map((s, idx) => (
                <div key={idx} className="p-4 bg-[#8B0000]/5 rounded-2xl border border-[#8B0000]/20 mb-3 flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-xs text-[#8B0000]">{s.customer_name}</div>
                    <div className="text-[11px] text-[#796C61] mt-1">{s.product_name} ({s.quantity} qty)</div>
                  </div>
                  <span className="bg-[#8B0000] text-white text-[10px] font-bold px-2 py-1 rounded-lg">PAUSED</span>
                </div>
              ))}
            </div>
          )}

          {adminTab === 'finance' && (
            <div className="grid grid-cols-2 gap-3"><div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm"><div className="text-[10px] font-bold text-[#796C61] uppercase">Total Sales</div><div className="text-xl font-extrabold text-[#2D241E] mt-1">₹{totalSales}</div></div><div className="bg-[#1E3F2D] p-4 rounded-3xl border border-[#152E20] shadow-md text-[#F4F0E6]"><div className="text-[10px] font-bold text-[#A5C0A0] uppercase">Wallet Recharges</div><div className="text-xl font-extrabold text-white mt-1">₹{totalRecharges}</div></div></div>
          )}
        </div>
      )}

      {role === 'delivery' && (
        <div className="max-w-md mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-gradient-to-br from-[#B5651D] to-[#965216] text-[#F4F0E6] p-4 sm:p-5 rounded-3xl shadow-lg border border-[#965216] flex justify-between items-center">
            <div><span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mb-1 inline-block">Agent: {user?.email?.split('@')[0]}</span><h1 className="font-extrabold text-base sm:text-lg text-white">Delivery Portal</h1></div><div className="text-3xl opacity-80">🛵</div>
          </div>
          <div className="bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm grid grid-cols-2 gap-1.5">
            <button onClick={() => setDeliveryTab('pending')} className={`py-2 px-3 rounded-xl text-xs transition-all font-bold ${deliveryTab === 'pending' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1]'}`}>📦 Pending Duties</button>
            <button onClick={() => setDeliveryTab('history')} className={`py-2 px-3 rounded-xl text-xs transition-all font-bold ${deliveryTab === 'history' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1]'}`}>📜 My History</button>
          </div>

          {deliveryTab === 'pending' && (
            <div className="space-y-3">
              {subscriptions.filter(s => s.status === 'Active').length === 0 && (<div className="text-center p-8 bg-white rounded-3xl border border-[#EBE5D9] shadow-sm"><div className="text-4xl mb-2 opacity-80">🎉</div><div className="text-xs text-[#796C61] font-bold">No pending deliveries!</div></div>)}
              {subscriptions.filter(s => s.status === 'Active').map((sub, idx) => {
                const cust = customers.find(c => String(c.id) === String(sub.customer_id));
                return (
                  <div key={idx} className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm group">
                    <div className="font-extrabold text-sm text-[#2D241E]">{cust?.name || sub.customer_name}</div>
                    <div className="text-[10px] font-medium text-[#796C61] mt-0.5 mb-2 leading-snug">📍 {cust?.address || 'Address not available'}</div>
                    <div className="flex justify-between items-center bg-[#F8F5EE] p-2.5 rounded-xl mb-3 border border-[#EBE5D9]"><div className="text-xs font-bold text-[#1E3F2D]"><span>🥛</span> {sub.product_name}</div><div className="text-xs font-extrabold text-[#B5651D] bg-white px-2 py-0.5 rounded-md border border-[#EBE5D9]">{sub.quantity} qty</div></div>
                    <div className="flex justify-between items-center mt-2"><div className="text-[10px] font-bold text-[#796C61]">{sub.payment_type === 'scan_deduct' ? '📱 Scan QR' : '⚡ Auto-Paid'}</div><button onClick={() => { setSelectedDelivery({...sub, cust}); setShowScannerModal(true); }} className="bg-[#1E3F2D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95">Scan & Deliver</button></div>
                  </div>
                );
              })}
            </div>
          )}
          {deliveryTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm flex justify-between items-center"><div><div className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Total Collected</div><div className="text-[10px] text-[#B5651D] font-medium">(From QR)</div></div><div className="text-xl font-extrabold text-[#1E3F2D]">₹{agentTotalCollected}</div></div>
              <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm"><h3 className="font-bold text-sm text-[#2D241E] mb-3">📜 Delivery Logs</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {agentTransactions.map((t, idx) => (
                    <div key={idx} className="p-3 bg-[#F8F5EE] rounded-2xl border border-[#EBE5D9] flex justify-between items-center gap-3"><div><div className="font-bold text-[#2D241E] text-xs line-clamp-1">{t.item?.split(' [Agent:')[0]}</div><div className="text-[10px] text-[#796C61] font-medium mt-0.5">To: <span className="font-bold">{t.customer_name}</span></div></div><div className="font-extrabold text-[#1E3F2D] text-xs shrink-0 bg-white border border-[#EBE5D9] px-2 py-1 rounded-lg">₹{t.amount}</div></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(role === 'guest' || role === 'customer') && (
         <main className="max-w-md mx-auto p-3.5 sm:p-4 space-y-5">
          <div className="relative w-full h-28 sm:h-32 overflow-hidden rounded-3xl shadow-md border border-[#EBE5D9]">
            {banners.map((b, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 w-full h-full p-4 transition-opacity duration-700 ease-in-out bg-gradient-to-br ${b.bg} text-[#F4F0E6] flex flex-col justify-center ${
                  idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <div className="relative z-10">
                  <h2 className="text-sm sm:text-base font-extrabold leading-tight">{b.title}</h2>
                  <p className="text-[10px] sm:text-[11px] text-white/90 mt-1 font-bold tracking-wide">{b.sub}</p>
                </div>
                <div className="absolute -right-2 -bottom-5 text-7xl opacity-15">{b.icon}</div>
              </div>
            ))}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {banners.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-4' : 'bg-white/50'}`}></div>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
            {['All', 'Dairy', 'Eggs', 'Ghee', 'Farm'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#796C61] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-1">
            {filteredProducts.map((p) => {
              const qtyInCart = getCartQuantity(p.id);
              return (
                <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-[#EBE5D9] flex flex-col justify-between hover:shadow-md transition-all group">
                  <div onClick={() => setViewProduct(p)} className="cursor-pointer">
                    <div className="w-12 h-12 bg-[#F8F5EE] border border-[#EBE5D9] group-hover:bg-[#F0EBE1] rounded-2xl flex items-center justify-center text-2xl mb-3 transition-colors">{p.icon || '🌿'}</div>
                    <div className="font-bold text-xs text-[#2D241E] leading-tight group-hover:text-[#B5651D] transition-colors">{p.name}</div>
                    <div className="text-sm font-extrabold text-[#B5651D] mt-1.5">₹{p.price} <span className="text-[10px] font-medium text-[#796C61]">/ {p.unit}</span></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <button onClick={() => { setSelectedSubProduct(p); setShowSubscribeModal(true); }} className="w-full bg-[#F8F5EE] hover:bg-[#F0EBE1] text-[#1E3F2D] font-bold py-2 rounded-xl text-[11px] transition-colors border border-[#EBE5D9]">📅 Subscribe</button>
                    {qtyInCart > 0 ? (
                      <div className="flex items-center justify-between bg-white rounded-xl p-1 border border-[#1E3F2D] shadow-sm"><button onClick={() => handleUpdateCartQuantity(p.id, -1)} className="w-7 h-7 bg-[#F8F5EE] rounded-lg font-bold text-[#2D241E]">-</button><span className="text-xs font-extrabold text-[#1E3F2D]">{qtyInCart}</span><button onClick={() => handleUpdateCartQuantity(p.id, 1)} className="w-7 h-7 bg-[#1E3F2D] text-[#F4F0E6] rounded-lg font-bold">+</button></div>
                    ) : (<button onClick={() => handleAddToCart(p)} className="w-full bg-[#1E3F2D] text-[#F4F0E6] font-bold py-2 rounded-xl text-xs shadow-md active:scale-95">🛒 Add</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {showWalletModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9] animate-slide-up">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E] flex items-center gap-2"><span>💳 Wallet & Passbook</span></h3>
              <button onClick={() => setShowWalletModal(false)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full border border-[#EBE5D9] flex items-center justify-center">✕</button>
            </div>

            <div className="bg-[#1E3F2D] text-white p-5 rounded-2xl shadow-inner text-center border border-[#152E20] relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-[#A5C0A0] uppercase tracking-widest">Current Balance</div>
                <div className="text-4xl font-extrabold mt-1 tracking-tight">₹{currentCustomer?.wallet_balance || 0}</div>
                <p className="text-[9px] text-[#A5C0A0] mt-2">Balance is used for subscriptions & orders</p>
              </div>
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">💳</div>
            </div>

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              <h4 className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide mb-2 sticky top-0 bg-[#F8F5EE] py-1">Transaction History</h4>
              {transactions.filter(t => t.customer_name === currentCustomer?.name).length === 0 ? (
                <p className="text-[11px] text-[#796C61] font-medium text-center py-4 bg-white rounded-xl border border-[#EBE5D9]">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.filter(t => t.customer_name === currentCustomer?.name).map((t, idx) => {
                     const isCredit = t.item?.includes('Recharge');
                     return (
                       <div key={idx} className="p-3 bg-white rounded-2xl border border-[#EBE5D9] text-xs flex justify-between items-center gap-3 shadow-sm hover:shadow-md transition">
                         <div>
                           <div className="font-bold text-[#2D241E] leading-snug line-clamp-1">{t.item.split(' [Agent:')[0]}</div>
                           <div className="text-[9px] text-[#796C61] mt-0.5">{new Date(t.created_at).toLocaleDateString()} | {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                         </div>
                         <div className={`font-extrabold shrink-0 px-2 py-1 rounded-md border ${isCredit ? 'text-[#1E3F2D] bg-[#1E3F2D]/5 border-[#1E3F2D]/20' : 'text-[#8B0000] bg-[#8B0000]/5 border-[#8B0000]/20'}`}>
                           {isCredit ? '+' : '-'}₹{t.amount}
                         </div>
                       </div>
                     );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOrdersModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9]">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E]">📦 My Orders & Subs</h3>
              <button onClick={() => setShowOrdersModal(false)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full border border-[#EBE5D9] flex items-center justify-center">✕</button>
            </div>
            
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <h4 className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide mb-2">My Subscriptions</h4>
                {subscriptions.filter(s => s.customer_id === currentCustomer?.id).length === 0 ? (
                   <p className="text-[11px] text-[#796C61] font-medium text-center py-2 bg-white rounded-xl border border-[#EBE5D9]">No subscriptions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.filter(s => s.customer_id === currentCustomer?.id).map((s, idx) => (
                      <div key={idx} className={`p-3.5 rounded-2xl border shadow-sm ${s.status === 'Paused' ? 'bg-[#8B0000]/5 border-[#8B0000]/20' : 'bg-white border-[#EBE5D9]'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={`font-extrabold ${s.status === 'Paused' ? 'text-[#8B0000]' : 'text-[#1E3F2D]'}`}>{s.product_name} <span className="text-[#B5651D]">({s.quantity})</span></div>
                            <div className="text-[10px] text-[#796C61] mt-1">{s.frequency} | {s.payment_type === 'scan_deduct' ? 'Scan to Pay' : 'Auto-Pay'}</div>
                          </div>
                          <button onClick={() => handleTogglePause(s.id, s.status, s.product_name)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${s.status === 'Paused' ? 'bg-[#1E3F2D] text-white border-[#1E3F2D]' : 'bg-white text-[#796C61] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>
                            {s.status === 'Paused' ? '▶ Resume' : '⏸ Pause'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#EBE5D9]">
                <h4 className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide mb-2">Recent Store Orders</h4>
                {transactions.filter(t => t.customer_name === currentCustomer?.name && t.item?.includes('Store Order')).length === 0 ? (
                  <p className="text-[11px] text-[#796C61] font-medium text-center py-2 bg-white rounded-xl border border-[#EBE5D9]">No recent store orders.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.filter(t => t.customer_name === currentCustomer?.name && t.item?.includes('Store Order')).map((t, idx) => (
                       <div key={idx} className="p-3 bg-white rounded-2xl border border-[#EBE5D9] text-xs flex justify-between items-center gap-3">
                         <div>
                           <div className="font-bold text-[#2D241E] leading-snug line-clamp-1">{t.item.replace('Store Order: ', '')}</div>
                           <div className="text-[9px] text-[#796C61] mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                         </div>
                         <div className="font-extrabold text-[#1E3F2D] shrink-0 bg-[#F8F5EE] px-2 py-1 rounded-md border border-[#EBE5D9]">
                           ₹{t.amount}
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
           <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#EBE5D9] animate-slide-up">
              <div className="flex justify-between items-start mb-4">
                 <div className="w-16 h-16 bg-white border border-[#EBE5D9] rounded-2xl flex items-center justify-center text-4xl shadow-sm">{viewProduct.icon}</div>
                 <button onClick={() => setViewProduct(null)} className="bg-white w-8 h-8 rounded-full border border-[#EBE5D9] flex items-center justify-center font-bold text-[#796C61]">✕</button>
              </div>
              <h3 className="font-extrabold text-lg text-[#2D241E]">{viewProduct.name}</h3>
              <div className="text-lg font-extrabold text-[#B5651D] mt-1">₹{viewProduct.price} <span className="text-xs text-[#796C61] font-medium">/ {viewProduct.unit}</span></div>
              
              <div className="mt-5 space-y-3">
                 <div className="bg-white p-3 rounded-2xl border border-[#EBE5D9] flex items-center gap-3">
                    <div className="text-xl">💯</div><div><div className="text-xs font-bold text-[#2D241E]">100% Organic & Pure</div><div className="text-[10px] text-[#796C61] mt-0.5">No chemicals, direct from our farms.</div></div>
                 </div>
                 <div className="bg-white p-3 rounded-2xl border border-[#EBE5D9] flex items-center gap-3">
                    <div className="text-xl">🛵</div><div><div className="text-xs font-bold text-[#2D241E]">Morning Delivery Guaranteed</div><div className="text-[10px] text-[#796C61] mt-0.5">Delivered fresh before 7:00 AM daily.</div></div>
                 </div>
              </div>
              <button onClick={() => setViewProduct(null)} className="w-full bg-[#1E3F2D] text-white font-bold py-3.5 rounded-xl text-xs mt-5 active:scale-95 transition">Close Information</button>
           </div>
        </div>
      )}

      {showSubscribeModal && selectedSubProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border border-[#EBE5D9]">
            <div className="flex justify-between items-center border-b border-[#EBE5D9] pb-3 mb-4 shrink-0"><h3 className="font-extrabold text-sm text-[#2D241E] flex items-center gap-2"><span>🥛 Daily Subscription</span></h3><button onClick={() => setShowSubscribeModal(false)} className="text-[#796C61] font-bold text-lg bg-white w-8 h-8 rounded-full flex items-center justify-center border border-[#EBE5D9]">✕</button></div>
            <div className="overflow-y-auto pr-1 space-y-5 pb-2">
              <div className="bg-white p-3.5 rounded-2xl border border-[#EBE5D9] flex items-center gap-3 shadow-sm"><span className="text-3xl bg-[#F8F5EE] w-12 h-12 rounded-xl flex items-center justify-center border border-[#EBE5D9]">{selectedSubProduct.icon || '🌿'}</span><div><div className="font-extrabold text-xs text-[#2D241E]">{selectedSubProduct.name}</div><div className="text-xs font-bold text-[#B5651D] mt-0.5">₹{selectedSubProduct.price} / {selectedSubProduct.unit}</div></div></div>
              <form onSubmit={handleCreateSubscription} className="space-y-5">
                <div><label className="text-[11px] font-bold text-[#796C61] uppercase block mb-2">Quantity per day</label><div className="flex items-center gap-2">{[1, 2, 3, 5].map((q) => (<button key={q} type="button" onClick={() => setSubQty(q)} className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold border ${subQty === q ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D]' : 'bg-white text-[#2D241E] border-[#EBE5D9]'}`}>{q}</button>))}</div></div>
                <div><label className="text-[11px] font-bold text-[#796C61] uppercase block mb-2">Frequency</label><div className="flex gap-2"><button type="button" onClick={() => setSubFreq('Daily')} className={`flex-1 py-3 rounded-xl text-xs font-bold border ${subFreq === 'Daily' ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D]' : 'bg-white text-[#2D241E] border-[#EBE5D9]'}`}>📅 Everyday</button><button type="button" onClick={() => setSubFreq('Alternate Days')} className={`flex-1 py-3 rounded-xl text-xs font-bold border ${subFreq === 'Alternate Days' ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D]' : 'bg-white text-[#2D241E] border-[#EBE5D9]'}`}>🗓️ Alt. Days</button></div></div>
                <div><label className="text-[11px] font-bold text-[#796C61] uppercase block mb-2">Payment</label><div className="space-y-2"><label className={`p-3.5 rounded-2xl border flex items-start gap-3 ${subPayType === 'scan_deduct' ? 'bg-[#F0EBE1] border-[#1E3F2D]' : 'bg-white border-[#EBE5D9]'}`}><input type="radio" checked={subPayType === 'scan_deduct'} onChange={() => setSubPayType('scan_deduct')} className="mt-0.5 accent-[#1E3F2D]" /><div><div className="text-xs font-bold text-[#2D241E]">📱 Cut after QR Scan</div></div></label><label className={`p-3.5 rounded-2xl border flex items-start gap-3 ${subPayType === 'auto_deduct' ? 'bg-[#F0EBE1] border-[#1E3F2D]' : 'bg-white border-[#EBE5D9]'}`}><input type="radio" checked={subPayType === 'auto_deduct'} onChange={() => setSubPayType('auto_deduct')} className="mt-0.5 accent-[#1E3F2D]" /><div><div className="text-xs font-bold text-[#2D241E]">⚡ Auto-Deduct Wallet</div></div></label></div></div>
                <div className="pt-2 sticky bottom-0 bg-[#F8F5EE] pb-1"><button type="submit" className="w-full bg-[#1E3F2D] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs">Confirm ➔</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#EBE5D9] max-h-[95vh] overflow-y-auto">
            <div className="flex gap-1 mb-5 bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm"><button onClick={() => setAuthRoleTab('customer')} className={`w-1/2 py-2 text-xs font-bold rounded-xl ${authRoleTab === 'customer' ? 'bg-[#1E3F2D] text-[#F4F0E6]' : 'text-[#796C61]'}`}>👤 Customer</button><button onClick={() => setAuthRoleTab('admin')} className={`w-1/2 py-2 text-xs font-bold rounded-xl ${authRoleTab === 'admin' ? 'bg-[#1E3F2D] text-[#F4F0E6]' : 'text-[#796C61]'}`}>🛡️ Staff/Admin</button></div>
            {loginError && <div className="mb-4 text-[10px] text-[#8B0000] bg-[#8B0000]/10 p-2.5 rounded-xl font-medium">{loginError}</div>}
            {authRoleTab === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-3.5">
                <input type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required />
                
                <div className="text-right mt-1">
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] text-[#796C61] hover:text-[#2D241E] font-bold">Forgot Password?</button>
                </div>

                <button type="submit" className="w-full bg-[#1E3F2D] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold mt-2">Login Securely ➔</button>
              </form>
            ) : (
              <form className="space-y-3.5">
                {authView === 'signup' && (<><input type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required /><input type="tel" placeholder="Mobile" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required /><textarea placeholder="Address" value={signupAddress} onChange={(e) => setSignupAddress(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9] h-16" required /></>)}
                <input type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border border-[#EBE5D9]" required />
                
                {authView === 'login' && (
                  <div className="text-right mt-1">
                    <button type="button" onClick={handleForgotPassword} className="text-[10px] text-[#B5651D] hover:underline font-bold">Forgot Password?</button>
                  </div>
                )}

                <button type="button" onClick={authView === 'login' ? handlePasswordLogin : handleCustomerSignup} className="w-full bg-[#1E3F2D] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold mt-2">{authView === 'login' ? 'Login ➔' : 'Sign Up ➔'}</button>
                <div className="text-center mt-4 text-[11px] text-[#796C61] font-medium">{authView === 'login' ? <button type="button" onClick={() => setAuthView('signup')} className="text-[#B5651D] font-bold">Sign Up</button> : <button type="button" onClick={() => setAuthView('login')} className="text-[#B5651D] font-bold">Login</button>}</div>
              </form>
            )}
            <div className="mt-5 pt-3 text-center"><button onClick={closeModal} className="text-[10px] bg-white border border-[#EBE5D9] text-[#796C61] font-bold py-2 px-4 rounded-full">Cancel</button></div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9]">
            <div className="flex justify-between items-center border-b border-[#EBE5D9] pb-3">
              <h3 className="font-extrabold text-sm text-[#2D241E]">✏️ Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#EBE5D9] transition">✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Product Name</label>
                <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Price (₹)</label>
                <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Category</label>
                <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]">
                  <option value="Dairy">🥛 Dairy & Milk</option>
                  <option value="Eggs">🥚 Farm Eggs</option>
                  <option value="Ghee">🏺 Vedic Ghee</option>
                  <option value="Farm">🌱 Organic Farm</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold transition shadow-md mt-2">Update Product ➔</button>
            </form>
          </div>
        </div>
      )}

      {showCartModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-4 sm:p-5 max-w-sm w-full shadow-2xl flex flex-col justify-between max-h-[85vh] border border-[#EBE5D9]">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9] mb-4"><h3 className="font-extrabold text-sm text-[#2D241E]">🛒 Cart</h3><button onClick={() => setShowCartModal(false)} className="text-[#796C61] font-bold bg-white w-8 h-8 rounded-full border border-[#EBE5D9] flex items-center justify-center">✕</button></div>
              {cart.length === 0 ? (<div className="py-12 text-center space-y-4"><p className="text-sm font-bold text-[#796C61]">Your cart is empty!</p></div>) : (
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 bg-white rounded-2xl flex items-center justify-between border border-[#EBE5D9] shadow-sm"><div className="flex items-center gap-3"><span className="text-2xl bg-[#F8F5EE] w-10 h-10 rounded-xl flex items-center justify-center border border-[#EBE5D9]">{item.icon}</span><div><div className="font-bold text-xs text-[#2D241E]">{item.name}</div><div className="text-[11px] text-[#796C61] font-medium mt-0.5">₹{item.price} | <span className="font-extrabold text-[#B5651D]">₹{item.price * item.quantity}</span></div></div></div><div className="flex items-center gap-2"><button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-[#F8F5EE] rounded-lg font-bold text-[#2D241E]">-</button><span className="text-xs font-extrabold text-[#2D241E] w-3 text-center">{item.quantity}</span><button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-[#1E3F2D] rounded-lg font-bold text-[#F4F0E6]">+</button></div></div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (<div className="pt-4 border-t border-[#EBE5D9] mt-4 space-y-3"><div className="flex justify-between items-center text-xs font-bold text-[#796C61] uppercase"><span>Total</span><span className="text-[#1E3F2D] text-lg font-extrabold">₹{getCartTotal()}</span></div><button onClick={handleCheckout} className="w-full bg-[#1E3F2D] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs">Proceed ➔</button></div>)}
          </div>
        </div>
      )}

      {showScannerModal && selectedDelivery && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#EBE5D9] text-center">
            <h3 className="font-extrabold text-sm text-[#2D241E] mb-2">Scan Customer QR</h3><p className="text-[10px] text-[#796C61] font-bold mb-4">For: {selectedDelivery.cust?.name}</p>
            <div className="w-48 h-48 mx-auto bg-black rounded-2xl border-4 border-[#1E3F2D] border-dashed flex flex-col items-center justify-center mb-4 relative overflow-hidden"><div className="w-full h-1 bg-red-500/60 absolute top-1/2 animate-pulse shadow-[0_0_10px_red]"></div></div>
            <button onClick={() => handleMarkDelivered(selectedDelivery)} className="w-full bg-[#1E3F2D] text-white py-3.5 rounded-xl text-xs font-extrabold">Simulate Scan ✅</button>
            <button onClick={() => setShowScannerModal(false)} className="w-full bg-transparent text-[#796C61] py-3 rounded-xl text-xs font-bold mt-2">Cancel</button>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border border-[#EBE5D9]">
            <h3 className="font-extrabold text-sm text-[#2D241E]">Delivery Identifier QR</h3>
            <div className="p-5 bg-white rounded-2xl inline-block border border-[#EBE5D9] shadow-sm"><div className="text-6xl">🏁</div><div className="text-xs font-mono font-extrabold mt-3 text-[#1E3F2D] tracking-widest">{currentCustomer?.qrCode}</div></div>
            <button onClick={() => setShowQRModal(false)} className="w-full bg-white border border-[#EBE5D9] hover:bg-[#F0EBE1] text-[#2D241E] text-xs font-bold py-3 rounded-xl mt-2">Close</button>
          </div>
        </div>
      )}

      {user && role === 'customer' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#F8F5EE]/90 backdrop-blur-xl border border-[#EBE5D9] shadow-[0_8px_30px_rgb(0,0,0,0.1)] z-40 px-4 sm:px-6 py-2.5 flex justify-between items-center rounded-3xl transition-all duration-300">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl bg-[#1E3F2D] text-[#F4F0E6] shadow-md group-active:scale-95"><span className="text-lg leading-none block">🏪</span></div><span className="text-[10px] font-extrabold text-[#1E3F2D] mt-1.5">Store</span></button>
          
          <button onClick={() => setShowOrdersModal(true)} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D]"><span className="text-lg leading-none block">📦</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5">Orders</span></button>
          
          <button onClick={() => setShowQRModal(true)} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D]"><span className="text-lg leading-none block">📱</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5">QR Pass</span></button>
          <button onClick={handleLogout} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#8B0000]/10 group-hover:text-[#8B0000]"><span className="text-lg leading-none block">🚪</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#8B0000] mt-1.5">Logout</span></button>
        </div>
      )}
    </div>
  );
}