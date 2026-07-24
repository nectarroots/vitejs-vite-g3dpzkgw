import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('guest');
  const [adminTab, setAdminTab] = useState<
    'products' | 'customers' | 'finance' | 'delivery'
  >('products');

  // Live States
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  const [cart, setCart] = useState<
    {
      id: string;
      name: string;
      price: number;
      unit: string;
      icon: string;
      quantity: number;
    }[]
  >(() => JSON.parse(localStorage.getItem('nr_cart') || '[]'));
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false); 
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedSubProduct, setSelectedSubProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Subscription Form States
  const [subQty, setSubQty] = useState(1);
  const [subFreq, setSubFreq] = useState<'Daily' | 'Alternate Days'>('Daily');
  const [subPayType, setSubPayType] = useState<'auto_deduct' | 'scan_deduct'>('scan_deduct');

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

  const currentCustomer = user
    ? customers.find((c) => c.email === user.email || c.id === user.id)
    : null;

  const [newProd, setNewProd] = useState({
    name: '',
    price: '',
    unit: 'Liter',
    category: 'Dairy',
    tag: 'Fresh',
  });

  // SUPABASE LIVE SYNC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        assignRoleByEmail(session.user.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          assignRoleByEmail(session.user.email);
        } else {
          setUser(null);
          setRole('guest');
        }
      }
    );

    fetchLiveDatabaseData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const assignRoleByEmail = (email: string | undefined) => {
    if (!email) return;
    if (email === 'admin@nectarroots.com') setRole('admin');
    else if (email === 'delivery@nectarroots.com') setRole('delivery');
    else setRole('customer');
  };

  const fetchLiveDatabaseData = async () => {
    try {
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) setProducts(prodData.map((p) => ({ ...p, id: String(p.id) })));

      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) {
        setCustomers(
          custData.map((c) => ({
            ...c,
            id: String(c.id),
            walletBalance: Number(c.wallet_balance ?? 0),
          }))
        );
      }

      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (txData) setTransactions(txData);

      const { data: subData } = await supabase.from('subscriptions').select('*');
      if (subData) setSubscriptions(subData);

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

  // 📧 EMAIL ALERT FUNCTION (WEB3FORMS)
  const sendEmailAlert = async (subject: string, message: string) => {
    const myAccessKey = '6c022681-4948-4be2-973e-3548e836739f'; 
    try {
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: myAccessKey,
          subject: subject,
          from_name: 'Nectar Roots Store 🌿',
          message: message,
        }),
      });
    } catch (error) {
      console.error('Email Error:', error);
    }
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

    const { data, error } = await supabase.auth.signUp({
      email: emailInput,
      password: passwordInput,
    });

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
        qrCode: `NR-${Math.floor(1000 + Math.random() * 9000)}`,
      };

      const { error: dbError } = await supabase.from('customers').insert([newCustomer]);
      if (dbError) {
        setLoginError('Account created but saving details failed: ' + dbError.message);
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
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });
    if (error) {
      setLoginError(error.message);
    } else {
      showToast('Logged in successfully! 🔓');
      closeModal();
    }
  };

  const handleForgotPassword = async () => {
    if (!emailInput) {
      setLoginError('Please enter your email above to reset password.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput);
    if (error) {
      setLoginError(error.message);
    } else {
      showToast('Password reset link sent to your email! 📧');
      setLoginError('');
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

  // CREATE SUBSCRIPTION FUNCTION
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || role === 'guest') {
      setShowSubscribeModal(false);
      setShowLoginModal(true);
      showToast('Please login to start subscription!', 'error');
      return;
    }

    if (!selectedSubProduct || !currentCustomer) return;

    try {
      const newSub = {
        customer_id: currentCustomer.id,
        customer_name: currentCustomer.name,
        product_name: selectedSubProduct.name,
        quantity: subQty,
        price: selectedSubProduct.price * subQty,
        frequency: subFreq,
        payment_type: subPayType,
        status: 'Active'
      };

      const { error } = await supabase.from('subscriptions').insert([newSub]);
      if (error) throw error;

      fetchLiveDatabaseData();
      setShowSubscribeModal(false);
      showToast(`Subscription Started for ${selectedSubProduct.name}! 📅`);

      sendEmailAlert(
        `📅 New Subscription: ${currentCustomer.name}`,
        `Hello Admin, you have a new subscription request!\n\nCustomer Details:\nName: ${currentCustomer.name}\nPhone: ${currentCustomer.phone}\nAddress: ${currentCustomer.address}\n\nSubscription Details:\nProduct: ${selectedSubProduct.name}\nQuantity: ${subQty} ${selectedSubProduct.unit} per day\nFrequency: ${subFreq}\nPayment Mode: ${subPayType === 'scan_deduct' ? 'Cut on QR Scan' : 'Auto-Deduct'}`
      );

    } catch (err: any) {
      alert("Subscription failed: " + err.message);
    }
  };

  // LIVE PRODUCT MANAGEMENT
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) return;

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: newProd.name,
          category: newProd.category,
          price: Number(newProd.price),
          original_price: Number(newProd.price) + 15,
          unit: newProd.unit,
          icon: '🌿',
          tag: newProd.tag,
        },
      ])
      .select();

    if (error) {
      alert('Database Insert Error: ' + error.message);
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

    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        price: editingProduct.price,
        category: editingProduct.category,
      })
      .eq('id', editingProduct.id);

    if (error) {
      alert('Update Failed: ' + error.message);
    } else {
      setProducts(
        products.map((p) =>
          String(p.id) === String(editingProduct.id) ? editingProduct : p
        )
      );
      setEditingProduct(null);
      showToast('Product updated successfully!');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Delete Failed: ' + error.message);
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
      setCart([
        ...cart,
        {
          id: String(product.id),
          name: product.name,
          price: Number(product.price),
          unit: product.unit || 'Unit',
          icon: product.icon || '🌿',
          quantity: 1,
        },
      ]);
    }
    showToast(`Added ${product.name}`);
  };

  const handleUpdateCartQuantity = (id: any, delta: number) => {
    const updatedCart = cart
      .map((item) => {
        if (String(item.id) === String(id)) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as typeof cart;
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

    if (!user || role === 'guest') {
      setShowCartModal(false);
      setShowLoginModal(true);
      showToast('Please login securely to checkout!', 'error');
      return;
    }

    const activeCustomer = customers.find((c) => c.email === user.email || c.id === user.id);

    if (!activeCustomer) {
      fetchLiveDatabaseData();
      showToast('Syncing profile, please try again.', 'error');
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
      amount: item.price * item.quantity,
    }));

    try {
      const { error: walletErr } = await supabase
        .from('customers')
        .update({ wallet_balance: newBalance })
        .eq('id', activeCustomer.id);
      if (walletErr) throw walletErr;

      const { error: txErr } = await supabase.from('transactions').insert(newTxs);
      if (txErr) throw txErr;

      fetchLiveDatabaseData();
      
      const orderedItemsText = cart.map(c => `- ${c.name} (${c.quantity} ${c.unit})`).join('\n');
      
      setCart([]);
      setShowCartModal(false);
      showToast(`Order Placed! ₹${total} deducted from wallet.`);

      sendEmailAlert(
        `🚨 New Order: ₹${total} by ${activeCustomer.name}`,
        `Hello Admin, you have a new checkout order!\n\nCustomer Details:\nName: ${activeCustomer.name}\nPhone: ${activeCustomer.phone}\nAddress: ${activeCustomer.address}\n\nOrder Total: ₹${total}\n\nItems Ordered:\n${orderedItemsText}`
      );

    } catch (e: any) {
      alert('Checkout failed: ' + e.message);
    }
  };

  const handleRecharge = async (custId: string) => {
    const cust = customers.find((c) => String(c.id) === String(custId));
    if (!cust) return;
    const rechargeAmount = 500;
    const newBal = Number(cust.wallet_balance || 0) + rechargeAmount;

    try {
      const { error: updateErr } = await supabase
        .from('customers')
        .update({ wallet_balance: newBal })
        .eq('id', custId);
      if (updateErr) throw updateErr;

      const { error: txErr } = await supabase.from('transactions').insert([
        {
          customer_name: cust.name,
          item: `Wallet Recharge (+₹${rechargeAmount})`,
          amount: rechargeAmount,
        },
      ]);
      if (txErr) throw txErr;

      fetchLiveDatabaseData();
      showToast(`Added ₹${rechargeAmount} to ${cust.name}'s wallet!`);
    } catch (e: any) {
      alert('Recharge failed: ' + e.message);
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRecharges = transactions
    .filter((t) => t.item?.includes('Recharge'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalSales = totalRevenue - totalRecharges;

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter(
          (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-slate-800 font-sans pb-28 antialiased selection:bg-emerald-100 relative">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-white font-medium text-xs max-w-xs transition-all ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-[#0A2E23]'
          }`}>
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
              <span>🛒</span>
              <span className="hidden sm:inline">Cart</span> 
              <span>({getCartCount()})</span>
            </button>
          )}

          {(!user || role === 'guest') && (
            <button onClick={() => setShowLoginModal(true)} className="bg-emerald-900/80 hover:bg-emerald-800 text-amber-200 font-semibold px-3 py-1.5 rounded-xl text-xs border border-emerald-700/50 transition whitespace-nowrap">
              Login / Signup
            </button>
          )}

          {user && role === 'customer' && (
            <button onClick={() => showToast('Wallet balances are updated automatically.')} className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-inner">
              <span>💳</span>
              <span>₹{currentCustomer?.wallet_balance || 0}</span>
            </button>
          )}

          {user && (role === 'admin' || role === 'delivery') && (
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs whitespace-nowrap">
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ADMIN DASHBOARD */}
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

          {/* ADMIN: CUSTOMERS */}
          {adminTab === 'customers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-sm text-slate-900">👥 Live Customer Data</h2>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-100">Total: {customers.length}</span>
                </div>
                {customers.length === 0 && <div className="text-xs text-center py-5 text-slate-500">No customers found.</div>}
                {customers.map((c) => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-2 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{c.name} (QR: {c.qrCode || 'NR-101'})</div>
                      <div className="text-[11px] text-slate-500">📞 {c.phone} | ✉️ {c.email}</div>
                      <div className="text-[11px] font-bold text-emerald-800 mt-0.5">Wallet: ₹{c.wallet_balance || 0}</div>
                    </div>
                    <button onClick={() => handleRecharge(c.id)} className="bg-[#0A2E23] text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow-sm">+ ₹500</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADMIN: PRODUCTS */}
          {adminTab === 'products' && (
            <div className="space-y-4">
              <form onSubmit={handleAddProduct} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="font-bold text-xs text-slate-900">+ Publish Live Product</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Product Title" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                  <input type="number" placeholder="Price (₹)" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                  <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="text-xs p-2.5 bg-slate-50 border rounded-xl">
                    <option value="Dairy">🥛 Dairy & Milk</option>
                    <option value="Eggs">🥚 Farm Eggs</option>
                    <option value="Ghee">🏺 Vedic Ghee</option>
                    <option value="Farm">🌱 Organic Farm</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#0A2E23] text-white text-xs py-2.5 rounded-xl font-semibold">Save to Database</button>
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
                          <div className="text-[11px] text-emerald-900 font-medium">₹{p.price} / {p.unit}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEditingProduct(p)} className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2.5 py-1 rounded-lg text-xs transition">✏️ Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2.5 py-1 rounded-lg text-xs transition">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ADMIN: FINANCE */}
          {adminTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Total Sales</div>
                  <div className="text-lg font-bold text-[#0A2E23] my-0.5">₹{totalSales}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Wallet Recharges</div>
                  <div className="text-lg font-bold text-emerald-600 my-0.5">₹{totalRecharges}</div>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="font-bold text-xs text-slate-900 mb-3">🧾 Live Transaction Logs</h2>
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
        </div>
      )}

      {/* STOREFRONT */}
      {(role === 'guest' || role === 'customer') && (
        <main className="max-w-md mx-auto p-3.5 sm:p-4 space-y-4">
          <div className="bg-gradient-to-br from-[#0A2E23] via-[#0E3D2F] to-[#051C15] text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-emerald-800/50">
            <h2 className="text-base sm:text-lg font-bold">Pure A2 Milk & Organic Produce</h2>
            <p className="text-xs text-emerald-200/90 mt-1">Daily subscription & fresh farm delivery at your doorstep.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Dairy', 'Eggs', 'Ghee', 'Farm'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${selectedCategory === cat ? 'bg-[#0A2E23] text-amber-200 border-[#0A2E23]' : 'bg-white text-slate-700 border-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((p) => {
              const qtyInCart = getCartQuantity(p.id);
              return (
                <div key={p.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mb-2">{p.icon || '🌿'}</div>
                    <div className="font-semibold text-xs text-slate-800">{p.name}</div>
                    <div className="text-sm font-bold text-[#0A2E23] mt-1">₹{p.price} <span className="text-[10px] font-normal text-slate-400">/ {p.unit}</span></div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <button onClick={() => { setSelectedSubProduct(p); setShowSubscribeModal(true); }} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-1.5 rounded-xl text-[11px] shadow-sm flex items-center justify-center gap-1">
                      <span>📅 Subscribe Daily</span>
                    </button>
                    {qtyInCart > 0 ? (
                      <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-200">
                        <button onClick={() => handleUpdateCartQuantity(p.id, -1)} className="w-6 h-6 bg-white rounded font-bold text-xs">-</button>
                        <span className="text-xs font-bold text-[#0A2E23]">{qtyInCart}</span>
                        <button onClick={() => handleUpdateCartQuantity(p.id, 1)} className="w-6 h-6 bg-[#0A2E23] text-white rounded font-bold text-xs">+</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddToCart(p)} className="w-full bg-[#0A2E23] text-white font-medium py-1.5 rounded-xl text-xs">
                        🛒 Buy Once
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* SUBSCRIPTION MODAL */}
      {showSubscribeModal && selectedSubProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3.5 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 mb-3 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><span>🥛 Daily Subscription Plan</span></h3>
              <button onClick={() => setShowSubscribeModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
            </div>
            <div className="overflow-y-auto pr-1 space-y-4 pb-2">
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <span className="text-3xl">{selectedSubProduct.icon || '🌿'}</span>
                <div>
                  <div className="font-bold text-xs text-slate-900">{selectedSubProduct.name}</div>
                  <div className="text-xs font-bold text-[#0A2E23]">₹{selectedSubProduct.price} / {selectedSubProduct.unit}</div>
                </div>
              </div>
              <form onSubmit={handleCreateSubscription} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Select Quantity per day:</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5].map((q) => (
                      <button key={q} type="button" onClick={() => setSubQty(q)} className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${subQty === q ? 'bg-[#0A2E23] text-white border-[#0A2E23]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Delivery Frequency:</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSubFreq('Daily')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition ${subFreq === 'Daily' ? 'bg-[#0A2E23] text-white border-[#0A2E23]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>📅 Everyday</button>
                    <button type="button" onClick={() => setSubFreq('Alternate Days')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition ${subFreq === 'Alternate Days' ? 'bg-[#0A2E23] text-white border-[#0A2E23]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>🗓️ Alt. Days</button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Payment Cut Preference:</label>
                  <div className="space-y-2">
                    <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${subPayType === 'scan_deduct' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="radio" name="payType" checked={subPayType === 'scan_deduct'} onChange={() => setSubPayType('scan_deduct')} className="mt-0.5 accent-[#0A2E23]" />
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">📱 Cut Money After QR Scan</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Delivery boy scans your QR code at doorstep, then money is deducted.</div>
                      </div>
                    </label>
                    <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${subPayType === 'auto_deduct' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="radio" name="payType" checked={subPayType === 'auto_deduct'} onChange={() => setSubPayType('auto_deduct')} className="mt-0.5 accent-[#0A2E23]" />
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">⚡ Auto-Deduct Morning</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Money auto-deducts daily. QR code scanned just for delivery confirmation.</div>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="pt-2 sticky bottom-0 bg-white pb-1">
                  <button type="submit" className="w-full bg-[#0A2E23] hover:bg-emerald-900 text-amber-200 font-bold py-3.5 rounded-xl text-xs shadow-md transition active:scale-95">
                    Confirm Subscription (₹{selectedSubProduct.price * subQty} / day) ➔
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✨ PREMIUM FLOATING BOTTOM NAVIGATION ✨ */}
      {user && role === 'customer' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-40 px-6 py-2.5 flex justify-between items-center rounded-3xl transition-all duration-300">
          
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-[#0A2E23] to-emerald-800 text-amber-200 shadow-md group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">🏪</span>
            </div>
            <span className="text-[10px] font-extrabold text-[#0A2E23] mt-1.5">Store</span>
          </button>

          <button onClick={() => setShowOrdersModal(true)} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-slate-400 group-hover:bg-emerald-50 group-hover:text-[#0A2E23] group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">📦</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-[#0A2E23] mt-1.5 transition-all">Orders</span>
          </button>

          <button onClick={() => setShowQRModal(true)} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-slate-400 group-hover:bg-emerald-50 group-hover:text-[#0A2E23] group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">📱</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-[#0A2E23] mt-1.5 transition-all">QR Pass</span>
          </button>

          <button onClick={handleLogout} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">🚪</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-500 mt-1.5 transition-all">Logout</span>
          </button>

        </div>
      )}
      {/* EDIT PRODUCT MODAL (FIXED) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">✏️ Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 font-bold hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Product Name</label>
                <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl mt-1" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Price (₹)</label>
                <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl mt-1" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl mt-1">
                  <option value="Dairy">🥛 Dairy & Milk</option>
                  <option value="Eggs">🥚 Farm Eggs</option>
                  <option value="Ghee">🏺 Vedic Ghee</option>
                  <option value="Farm">🌱 Organic Farm</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#0A2E23] hover:bg-emerald-900 text-white text-xs py-3 rounded-xl font-bold transition">Update Product ➔</button>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN / SIGNUP MODAL (FIXED WITH FORGOT PASSWORD & TOGGLES) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setAuthRoleTab('customer')} className={`w-1/2 py-2 text-xs font-bold rounded-lg ${authRoleTab === 'customer' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500'}`}>👤 Customer</button>
              <button onClick={() => setAuthRoleTab('admin')} className={`w-1/2 py-2 text-xs font-bold rounded-lg ${authRoleTab === 'admin' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500'}`}>🛡️ Admin</button>
            </div>
            
            {loginError && <div className="mb-3 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{loginError}</div>}

            {authRoleTab === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <input type="email" placeholder="Admin Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                <button type="submit" className="w-full bg-[#0A2E23] text-white text-xs py-2.5 rounded-xl font-bold">Login Admin ➔</button>
              </form>
            ) : (
              <form className="space-y-3">
                {authView === 'signup' && (
                  <>
                    <input type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                    <input type="tel" placeholder="Mobile Number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                    <textarea placeholder="Delivery Address" value={signupAddress} onChange={(e) => setSignupAddress(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl h-14" required />
                  </>
                )}
                <input type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl" required />
                
                {authView === 'login' && (
                  <div className="flex justify-end">
                    <button type="button" onClick={handleForgotPassword} className="text-[10px] text-emerald-700 font-bold hover:underline">Forgot Password?</button>
                  </div>
                )}

                {authView === 'login' ? (
                  <button type="button" onClick={handlePasswordLogin} className="w-full bg-[#0A2E23] text-white text-xs py-2.5 rounded-xl font-bold mt-1">Login ➔</button>
                ) : (
                  <button type="button" onClick={handleCustomerSignup} className="w-full bg-[#0A2E23] text-white text-xs py-2.5 rounded-xl font-bold mt-1">Sign Up ➔</button>
                )}

                {/* LOGIN/SIGNUP SWITCHER BUTTON */}
                <div className="text-center mt-4 text-[11px] text-slate-500">
                  {authView === 'login' ? (
                    <>Don't have an account? <button type="button" onClick={() => setAuthView('signup')} className="text-emerald-700 font-bold ml-1 hover:underline">Sign Up</button></>
                  ) : (
                    <>Already have an account? <button type="button" onClick={() => setAuthView('login')} className="text-emerald-700 font-bold ml-1 hover:underline">Login</button></>
                  )}
                </div>
              </form>
            )}
            <div className="mt-4 border-t pt-3 text-center">
               <button onClick={closeModal} className="text-[10px] text-slate-400 font-bold hover:text-slate-700">Cancel & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CART MODAL (FIXED CHECKOUT ERROR HANDLING) */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-xl border border-slate-100 max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><span>🛒 Shopping Cart</span></h3>
                <button onClick={() => setShowCartModal(false)} className="text-slate-400 font-bold hover:text-slate-700">✕</button>
              </div>
              {cart.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="text-5xl">🛒</div>
                  <p className="text-sm font-semibold text-slate-700">Your cart is empty!</p>
                  <button onClick={() => setShowCartModal(false)} className="bg-[#0A2E23] hover:bg-emerald-900 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-sm">Browse Products</button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200/80">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="font-semibold text-xs text-slate-800">{item.name}</div>
                          <div className="text-[11px] text-emerald-900 font-medium mt-0.5">₹{item.price} / {item.unit} | <span className="font-bold text-[#0A2E23]">Total: ₹{item.price * item.quantity}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-white rounded-lg font-bold text-sm border text-slate-700">-</button>
                        <span className="text-xs font-bold text-slate-900 w-3 text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-[#0A2E23] rounded-lg font-bold text-sm text-white">+</button>
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
            <p className="text-[11px] text-slate-500">Show this QR code to delivery agent for verification.</p>
            <button onClick={() => setShowQRModal(false)} className="w-full bg-[#0A2E23] text-white text-xs font-semibold py-2 rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* ORDERS MODAL */}
      {showOrdersModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">📦 Subscriptions & Orders</h3>
              <button onClick={() => setShowOrdersModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <h4 className="text-xs font-bold text-emerald-900">Active Subscriptions:</h4>
              {subscriptions.filter(s => s.customer_id === currentCustomer?.id).length === 0 && <p className="text-[10px] text-slate-400">No active subscriptions.</p>}
              {subscriptions.filter(s => s.customer_id === currentCustomer?.id).map((s, idx) => (
                <div key={idx} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                  <div className="font-bold text-slate-800">{s.product_name} ({s.quantity} qty)</div>
                  <div className="text-[10px] text-slate-500">Mode: {s.payment_type === 'scan_deduct' ? '📱 Cut on Scan' : '⚡ Auto-Deduct'} | {s.frequency}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}