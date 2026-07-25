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
  const sendEmailAlert = async (subject: string, message: string, customerEmail: string = 'admin@nectarroots.com') => {
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
          email: customerEmail,
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
    <div className="min-h-screen bg-[#F8F5EE] text-[#2D241E] font-sans pb-28 antialiased selection:bg-[#EBE5D9] relative">
      {/* Dynamic Notifications */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-white font-medium text-xs max-w-xs transition-all border ${
            toast.type === 'error' ? 'bg-[#8B0000] border-[#5C0000]' : 'bg-[#1E3F2D] border-[#152E20]'
          }`}>
          {toast.msg}
        </div>
      )}

      {/* HEADER SECTION (EARTHY & RICH) */}
      <header className="bg-[#1E3F2D] text-[#F4F0E6] px-4 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.1)] sticky top-0 z-20 flex justify-between items-center backdrop-blur-md border-b border-[#152E20]">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 bg-[#2C523D] border border-[#3A6B50] rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0">🌿</div>
          <div className="shrink-0">
            <h1 className="font-extrabold text-base tracking-tight leading-none text-[#F4F0E6] whitespace-nowrap">Nectar Roots</h1>
            <p className="text-[10px] text-[#B5651D] font-bold tracking-widest uppercase leading-none mt-1 whitespace-nowrap">
              {role === 'admin' ? 'Live Admin DB' : user ? `Hi, ${currentCustomer?.name?.split(' ')[0] || 'User'}` : 'Pure • Organic • Farm'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(role === 'guest' || role === 'customer') && (
            <button onClick={() => setShowCartModal(true)} className="bg-[#B5651D] hover:bg-[#965216] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#B5651D]/20 transition active:scale-95">
              <span>🛒</span>
              <span className="hidden sm:inline">Cart</span> 
              <span>({getCartCount()})</span>
            </button>
          )}

          {(!user || role === 'guest') && (
            <button onClick={() => setShowLoginModal(true)} className="bg-[#F8F5EE]/10 hover:bg-[#F8F5EE]/20 border border-[#F8F5EE]/20 text-[#F4F0E6] font-semibold px-3 py-1.5 rounded-xl text-xs transition whitespace-nowrap">
              Login / Signup
            </button>
          )}

          {user && role === 'customer' && (
            <button onClick={() => showToast('Wallet balances are updated automatically.')} className="bg-[#2C523D] hover:bg-[#3A6B50] border border-[#3A6B50] text-[#F4F0E6] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-inner transition">
              <span>💳</span>
              <span>₹{currentCustomer?.wallet_balance || 0}</span>
            </button>
          )}

          {user && (role === 'admin' || role === 'delivery') && (
            <button onClick={handleLogout} className="bg-[#8B0000] hover:bg-[#5C0000] text-white font-bold px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition border border-[#5C0000]">
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ADMIN DASHBOARD */}
      {role === 'admin' && (
        <div className="max-w-4xl mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-gradient-to-br from-[#1E3F2D] to-[#2C523D] text-[#F4F0E6] p-4 sm:p-5 rounded-3xl shadow-lg border border-[#152E20] flex justify-between items-center">
            <div>
              <span className="bg-[#B5651D]/20 text-[#D79A5E] border border-[#B5651D]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">Master Dashboard</span>
              <h1 className="font-extrabold text-base sm:text-lg text-white">Nectar Roots Control Panel</h1>
              <p className="text-xs text-[#B5651D] font-bold mt-1">LIVE DATABASE SYNCED 🟢</p>
            </div>
            <div className="text-3xl opacity-80">⚙️</div>
          </div>

          <div className="bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {['customers', 'products', 'finance', 'delivery'].map((tab) => (
              <button key={tab} onClick={() => setAdminTab(tab as any)} className={`py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${adminTab === tab ? 'bg-[#1E3F2D] text-[#F4F0E6] font-bold shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1] hover:text-[#2D241E] font-semibold'}`}>
                <span>{tab === 'customers' ? '👥' : tab === 'products' ? '📦' : tab === 'finance' ? '📊' : '🛵'}</span>
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>

          {/* ADMIN: CUSTOMERS */}
          {adminTab === 'customers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EBE5D9] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-sm text-[#2D241E]">👥 Live Customer Data</h2>
                  <span className="text-xs font-bold bg-[#F0EBE1] text-[#1E3F2D] px-3 py-1 rounded-full border border-[#EBE5D9]">Total: {customers.length}</span>
                </div>
                {customers.length === 0 && <div className="text-xs text-center py-8 text-[#796C61] font-medium">No customers found.</div>}
                {customers.map((c) => (
                  <div key={c.id} className="p-4 bg-[#F8F5EE] rounded-2xl border border-[#EBE5D9] mb-3 flex justify-between items-center hover:shadow-sm transition">
                    <div>
                      <div className="font-extrabold text-xs text-[#2D241E]">{c.name} <span className="text-[#796C61] font-medium">(QR: {c.qrCode || 'NR-101'})</span></div>
                      <div className="text-[11px] text-[#796C61] mt-1">📞 {c.phone} | ✉️ {c.email}</div>
                      <div className="text-[11px] font-extrabold text-[#B5651D] mt-1">Wallet: ₹{c.wallet_balance || 0}</div>
                    </div>
                    <button onClick={() => handleRecharge(c.id)} className="bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs px-4 py-2 rounded-xl font-bold shadow-sm transition active:scale-95">+ ₹500</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADMIN: PRODUCTS */}
          {adminTab === 'products' && (
            <div className="space-y-4">
              <form onSubmit={handleAddProduct} className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EBE5D9] shadow-sm space-y-4">
                <h2 className="font-bold text-sm text-[#2D241E]">+ Publish Live Product</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Product Title" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                  <input type="number" placeholder="Price (₹)" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                  <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="text-xs p-3 bg-[#F8F5EE] border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]">
                    <option value="Dairy">🥛 Dairy & Milk</option>
                    <option value="Eggs">🥚 Farm Eggs</option>
                    <option value="Ghee">🏺 Vedic Ghee</option>
                    <option value="Farm">🌱 Organic Farm</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs py-3 rounded-xl font-bold shadow-md transition active:scale-95">Save to Database</button>
              </form>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EBE5D9] shadow-sm">
                <h2 className="font-bold text-sm text-[#2D241E] mb-4">📦 Live Database Inventory</h2>
                {products.length === 0 && <div className="text-xs text-center py-8 text-[#796C61] font-medium">Database is empty. Add a product above.</div>}
                <div className="divide-y divide-[#EBE5D9]">
                  {products.map((p) => (
                    <div key={p.id} className="py-3 flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#F0EBE1] rounded-xl flex items-center justify-center text-xl border border-[#EBE5D9] shrink-0">{p.icon || '🌿'}</div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#2D241E] truncate">{p.name}</div>
                          <div className="text-[11px] text-[#B5651D] font-extrabold mt-0.5">₹{p.price} <span className="text-[#796C61] font-medium">/ {p.unit}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditingProduct(p)} className="bg-[#F0EBE1] hover:bg-[#EBE5D9] text-[#2D241E] font-bold px-3 py-1.5 rounded-xl text-[11px] transition">✏️ Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-[#8B0000]/10 hover:bg-[#8B0000]/20 text-[#8B0000] font-bold px-3 py-1.5 rounded-xl text-[11px] transition">🗑️ Delete</button>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
                  <div className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Total Sales</div>
                  <div className="text-xl font-extrabold text-[#2D241E] mt-1">₹{totalSales}</div>
                </div>
                <div className="bg-[#1E3F2D] p-4 rounded-3xl border border-[#152E20] shadow-md text-[#F4F0E6]">
                  <div className="text-[10px] font-bold text-[#A5C0A0] uppercase tracking-wide">Wallet Recharges</div>
                  <div className="text-xl font-extrabold text-white mt-1">₹{totalRecharges}</div>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EBE5D9] shadow-sm">
                <h2 className="font-bold text-sm text-[#2D241E] mb-4">🧾 Live Transaction Logs</h2>
                {transactions.length === 0 && <div className="text-xs text-center py-8 text-[#796C61] font-medium">No transactions recorded yet.</div>}
                <div className="divide-y divide-[#EBE5D9] max-h-72 overflow-y-auto pr-2">
                  {transactions.map((t, idx) => (
                    <div key={t.id || idx} className="py-3 flex justify-between items-center text-xs gap-3">
                      <div>
                        <div className="font-bold text-[#2D241E]">{t.item}</div>
                        <div className="text-[10px] text-[#796C61] font-medium mt-0.5">Customer: {t.customer_name}</div>
                      </div>
                      <div className={`font-extrabold px-2.5 py-1 rounded-lg ${t.item?.includes('Recharge') ? 'bg-[#F0EBE1] text-[#1E3F2D]' : 'bg-[#8B0000]/10 text-[#8B0000]'}`}>
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

      {/* STOREFRONT (PREMIUM FARM STYLE) */}
      {(role === 'guest' || role === 'customer') && (
        <main className="max-w-md mx-auto p-3.5 sm:p-4 space-y-5">
          <div className="bg-gradient-to-br from-[#1E3F2D] to-[#2C523D] text-[#F4F0E6] p-5 rounded-3xl shadow-lg relative overflow-hidden border border-[#152E20]">
            <div className="relative z-10">
              <h2 className="text-lg font-extrabold leading-snug text-[#F4F0E6]">Pure A2 Milk &<br/>Organic Farm Produce</h2>
              <p className="text-xs text-[#D79A5E] mt-1.5 font-bold tracking-wide">Straight from our soil to your soul. 🌾</p>
            </div>
            <div className="absolute -right-2 -bottom-6 text-8xl opacity-10">🏺</div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
            {['All', 'Dairy', 'Eggs', 'Ghee', 'Farm'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#796C61] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-1">
            {filteredProducts.map((p) => {
              const qtyInCart = getCartQuantity(p.id);
              return (
                <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-[#EBE5D9] flex flex-col justify-between hover:shadow-md transition-all group">
                  <div>
                    <div className="w-12 h-12 bg-[#F8F5EE] border border-[#EBE5D9] group-hover:bg-[#F0EBE1] rounded-2xl flex items-center justify-center text-2xl mb-3 transition-colors">{p.icon || '🌿'}</div>
                    <div className="font-bold text-xs text-[#2D241E] leading-tight">{p.name}</div>
                    <div className="text-sm font-extrabold text-[#B5651D] mt-1.5">₹{p.price} <span className="text-[10px] font-medium text-[#796C61]">/ {p.unit}</span></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <button onClick={() => { setSelectedSubProduct(p); setShowSubscribeModal(true); }} className="w-full bg-[#F8F5EE] hover:bg-[#F0EBE1] text-[#1E3F2D] font-bold py-2 rounded-xl text-[11px] transition-colors border border-[#EBE5D9]">
                      📅 Subscribe
                    </button>
                    {qtyInCart > 0 ? (
                      <div className="flex items-center justify-between bg-white rounded-xl p-1 border border-[#1E3F2D] shadow-sm">
                        <button onClick={() => handleUpdateCartQuantity(p.id, -1)} className="w-7 h-7 bg-[#F8F5EE] hover:bg-[#F0EBE1] rounded-lg font-bold text-[#2D241E] text-sm transition">-</button>
                        <span className="text-xs font-extrabold text-[#1E3F2D]">{qtyInCart}</span>
                        <button onClick={() => handleUpdateCartQuantity(p.id, 1)} className="w-7 h-7 bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] rounded-lg font-bold text-sm transition">+</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddToCart(p)} className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] font-bold py-2 rounded-xl text-xs shadow-md transition active:scale-95">
                        🛒 Add
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
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border border-[#EBE5D9]">
            <div className="flex justify-between items-center border-b border-[#EBE5D9] pb-3 mb-4 shrink-0">
              <h3 className="font-extrabold text-sm text-[#2D241E] flex items-center gap-2"><span>🥛 Daily Subscription</span></h3>
              <button onClick={() => setShowSubscribeModal(false)} className="text-[#796C61] hover:text-[#2D241E] font-bold text-lg bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#EBE5D9] transition">✕</button>
            </div>
            <div className="overflow-y-auto pr-1 space-y-5 pb-2">
              <div className="bg-white p-3.5 rounded-2xl border border-[#EBE5D9] flex items-center gap-3 shadow-sm">
                <span className="text-3xl bg-[#F8F5EE] w-12 h-12 rounded-xl flex items-center justify-center border border-[#EBE5D9]">{selectedSubProduct.icon || '🌿'}</span>
                <div>
                  <div className="font-extrabold text-xs text-[#2D241E]">{selectedSubProduct.name}</div>
                  <div className="text-xs font-bold text-[#B5651D] mt-0.5">₹{selectedSubProduct.price} / {selectedSubProduct.unit}</div>
                </div>
              </div>
              <form onSubmit={handleCreateSubscription} className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide block mb-2">Quantity per day</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5].map((q) => (
                      <button key={q} type="button" onClick={() => setSubQty(q)} className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${subQty === q ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#2D241E] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide block mb-2">Delivery Frequency</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSubFreq('Daily')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${subFreq === 'Daily' ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#2D241E] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>📅 Everyday</button>
                    <button type="button" onClick={() => setSubFreq('Alternate Days')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${subFreq === 'Alternate Days' ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#2D241E] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>🗓️ Alt. Days</button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide block mb-2">Payment Preference</label>
                  <div className="space-y-2">
                    <label className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${subPayType === 'scan_deduct' ? 'bg-[#F0EBE1] border-[#1E3F2D]' : 'bg-white border-[#EBE5D9] hover:bg-[#F8F5EE]'}`}>
                      <input type="radio" name="payType" checked={subPayType === 'scan_deduct'} onChange={() => setSubPayType('scan_deduct')} className="mt-0.5 accent-[#1E3F2D] w-4 h-4" />
                      <div>
                        <div className="text-xs font-bold text-[#2D241E]">📱 Cut Money After QR Scan</div>
                        <div className="text-[10px] text-[#796C61] mt-1 leading-snug font-medium">Delivery boy scans your QR code at doorstep, then money is deducted.</div>
                      </div>
                    </label>
                    <label className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${subPayType === 'auto_deduct' ? 'bg-[#F0EBE1] border-[#1E3F2D]' : 'bg-white border-[#EBE5D9] hover:bg-[#F8F5EE]'}`}>
                      <input type="radio" name="payType" checked={subPayType === 'auto_deduct'} onChange={() => setSubPayType('auto_deduct')} className="mt-0.5 accent-[#1E3F2D] w-4 h-4" />
                      <div>
                        <div className="text-xs font-bold text-[#2D241E]">⚡ Auto-Deduct Morning</div>
                        <div className="text-[10px] text-[#796C61] mt-1 leading-snug font-medium">Money auto-deducts daily. QR code scanned just for delivery confirmation.</div>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="pt-2 sticky bottom-0 bg-[#F8F5EE] pb-1">
                  <button type="submit" className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs shadow-lg transition active:scale-95">
                    Confirm (₹{selectedSubProduct.price * subQty} / day) ➔
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✨ PREMIUM FLOATING BOTTOM NAVIGATION (FARM STYLE) ✨ */}
      {user && role === 'customer' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#F8F5EE]/90 backdrop-blur-xl border border-[#EBE5D9] shadow-[0_8px_30px_rgb(0,0,0,0.1)] z-40 px-6 py-2.5 flex justify-between items-center rounded-3xl transition-all duration-300">
          
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl bg-[#1E3F2D] text-[#F4F0E6] shadow-md group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">🏪</span>
            </div>
            <span className="text-[10px] font-extrabold text-[#1E3F2D] mt-1.5">Store</span>
          </button>

          <button onClick={() => setShowOrdersModal(true)} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D] group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">📦</span>
            </div>
            <span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5 transition-all">Orders</span>
          </button>

          <button onClick={() => setShowQRModal(true)} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D] group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">📱</span>
            </div>
            <span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5 transition-all">QR Pass</span>
          </button>

          <button onClick={handleLogout} className="flex flex-col items-center group relative">
            <div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#8B0000]/10 group-hover:text-[#8B0000] group-active:scale-95 transition-all">
              <span className="text-lg leading-none block">🚪</span>
            </div>
            <span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#8B0000] mt-1.5 transition-all">Logout</span>
          </button>

        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
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

      {/* LOGIN / SIGNUP MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#EBE5D9]">
            <div className="flex gap-1 mb-5 bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm">
              <button onClick={() => setAuthRoleTab('customer')} className={`w-1/2 py-2 text-xs font-bold rounded-xl transition-all ${authRoleTab === 'customer' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-sm' : 'text-[#796C61] hover:text-[#2D241E]'}`}>👤 Customer</button>
              <button onClick={() => setAuthRoleTab('admin')} className={`w-1/2 py-2 text-xs font-bold rounded-xl transition-all ${authRoleTab === 'admin' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-sm' : 'text-[#796C61] hover:text-[#2D241E]'}`}>🛡️ Admin</button>
            </div>
            
            {loginError && <div className="mb-4 text-[10px] text-[#8B0000] bg-[#8B0000]/10 p-2.5 rounded-xl border border-[#8B0000]/20 font-medium">{loginError}</div>}

            {authRoleTab === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-3.5">
                <input type="email" placeholder="Admin Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                <button type="submit" className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold shadow-md transition active:scale-95">Login Admin ➔</button>
              </form>
            ) : (
              <form className="space-y-3.5">
                {authView === 'signup' && (
                  <>
                    <input type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                    <input type="tel" placeholder="Mobile Number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                    <textarea placeholder="Delivery Address" value={signupAddress} onChange={(e) => setSignupAddress(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E] h-16" required />
                  </>
                )}
                <input type="email" placeholder="Email Address" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#1E3F2D] transition text-[#2D241E]" required />
                
                {authView === 'login' && (
                  <div className="flex justify-end pt-1">
                    <button type="button" onClick={handleForgotPassword} className="text-[10px] text-[#B5651D] font-bold hover:underline">Forgot Password?</button>
                  </div>
                )}

                {authView === 'login' ? (
                  <button type="button" onClick={handlePasswordLogin} className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold mt-2 shadow-md transition active:scale-95">Login ➔</button>
                ) : (
                  <button type="button" onClick={handleCustomerSignup} className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold mt-2 shadow-md transition active:scale-95">Sign Up ➔</button>
                )}

                <div className="text-center mt-4 text-[11px] text-[#796C61] font-medium">
                  {authView === 'login' ? (
                    <>Don't have an account? <button type="button" onClick={() => setAuthView('signup')} className="text-[#B5651D] font-bold ml-1 hover:underline">Sign Up</button></>
                  ) : (
                    <>Already have an account? <button type="button" onClick={() => setAuthView('login')} className="text-[#B5651D] font-bold ml-1 hover:underline">Login</button></>
                  )}
                </div>
              </form>
            )}
            <div className="mt-5 pt-3 text-center">
               <button onClick={closeModal} className="text-[10px] bg-white hover:bg-[#F0EBE1] border border-[#EBE5D9] text-[#796C61] font-bold py-2 px-4 rounded-full transition">Cancel & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CART MODAL */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-4 sm:p-5 max-w-sm w-full shadow-2xl flex flex-col justify-between max-h-[85vh] border border-[#EBE5D9]">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9] mb-4">
                <h3 className="font-extrabold text-sm text-[#2D241E] flex items-center gap-2"><span>🛒 Shopping Cart</span></h3>
                <button onClick={() => setShowCartModal(false)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#EBE5D9] transition">✕</button>
              </div>
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="text-6xl opacity-80">🛒</div>
                  <p className="text-sm font-bold text-[#796C61]">Your cart is empty!</p>
                  <button onClick={() => setShowCartModal(false)} className="bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] font-bold px-6 py-2.5 rounded-xl text-xs transition">Browse Products</button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 bg-white rounded-2xl flex items-center justify-between border border-[#EBE5D9] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl bg-[#F8F5EE] w-10 h-10 rounded-xl flex items-center justify-center border border-[#EBE5D9]">{item.icon}</span>
                        <div>
                          <div className="font-bold text-xs text-[#2D241E]">{item.name}</div>
                          <div className="text-[11px] text-[#796C61] font-medium mt-0.5">₹{item.price} / {item.unit} | <span className="font-extrabold text-[#B5651D]">Total: ₹{item.price * item.quantity}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-[#F8F5EE] hover:bg-[#F0EBE1] border border-[#EBE5D9] rounded-lg font-bold text-sm text-[#2D241E] transition">-</button>
                        <span className="text-xs font-extrabold text-[#2D241E] w-3 text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-[#1E3F2D] hover:bg-[#152E20] rounded-lg font-bold text-sm text-[#F4F0E6] transition">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#EBE5D9] mt-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-[#796C61] uppercase tracking-wide">
                  <span>Total Amount</span>
                  <span className="text-[#1E3F2D] text-lg font-extrabold">₹{getCartTotal()}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs shadow-lg transition active:scale-95">
                  Proceed to Checkout ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border border-[#EBE5D9]">
            <h3 className="font-extrabold text-sm text-[#2D241E]">Delivery Identifier QR</h3>
            <div className="p-5 bg-white rounded-2xl inline-block border border-[#EBE5D9] shadow-sm">
              <div className="text-6xl">🏁</div>
              <div className="text-xs font-mono font-extrabold mt-3 text-[#1E3F2D] tracking-widest">{currentCustomer?.qrCode}</div>
            </div>
            <p className="text-[11px] text-[#796C61] font-medium">Show this QR code to delivery agent for verification.</p>
            <button onClick={() => setShowQRModal(false)} className="w-full bg-white border border-[#EBE5D9] hover:bg-[#F0EBE1] text-[#2D241E] text-xs font-bold py-3 rounded-xl transition mt-2 shadow-sm">Close</button>
          </div>
        </div>
      )}

{/* ORDERS MODAL */}
{showOrdersModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9]">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E]">📦 My Orders & Subs</h3>
              <button onClick={() => setShowOrdersModal(false)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#EBE5D9] transition">✕</button>
            </div>
            
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* SECTION 1: Active Subscriptions */}
              <div>
                <h4 className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide mb-2">Active Subscriptions</h4>
                {subscriptions.filter(s => s.customer_id === currentCustomer?.id).length === 0 ? (
                  <p className="text-[11px] text-[#796C61] font-medium text-center py-2 bg-white rounded-xl border border-[#EBE5D9]">No active subscriptions.</p>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.filter(s => s.customer_id === currentCustomer?.id).map((s, idx) => (
                      <div key={idx} className="p-3.5 bg-white rounded-2xl border border-[#EBE5D9] text-xs shadow-sm hover:shadow-md transition">
                        <div className="font-extrabold text-[#1E3F2D]">{s.product_name} <span className="text-[#B5651D] font-bold">({s.quantity} qty)</span></div>
                        <div className="text-[10px] text-[#796C61] font-medium mt-1.5 flex justify-between">
                          <span>{s.payment_type === 'scan_deduct' ? '📱 Cut on Scan' : '⚡ Auto-Deduct'}</span>
                          <span className="font-bold text-[#2D241E]">{s.frequency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Past Cart Orders */}
              <div className="pt-2 border-t border-[#EBE5D9]">
                <h4 className="text-[11px] font-bold text-[#796C61] uppercase tracking-wide mb-2">Recent Orders</h4>
                {transactions.filter(t => t.customer_name === currentCustomer?.name && !t.item?.includes('Recharge')).length === 0 ? (
                  <p className="text-[11px] text-[#796C61] font-medium text-center py-2 bg-white rounded-xl border border-[#EBE5D9]">No recent orders found.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.filter(t => t.customer_name === currentCustomer?.name && !t.item?.includes('Recharge')).map((t, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-2xl border border-[#EBE5D9] text-xs shadow-sm flex justify-between items-center gap-3">
                        <div>
                          <div className="font-bold text-[#2D241E] leading-snug line-clamp-2">{t.item}</div>
                          <div className="text-[10px] text-[#796C61] font-medium mt-0.5">Paid via Wallet 💳</div>
                        </div>
                        <div className="font-extrabold text-[#1E3F2D] shrink-0">₹{t.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}