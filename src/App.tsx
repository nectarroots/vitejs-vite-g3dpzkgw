import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('guest');
  const [adminTab, setAdminTab] = useState<
    'overview' | 'dispatch' | 'customers' | 'products' | 'delivery' | 'broadcast' | 'promos'
  >('overview');

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([{ code: 'FIRSTFREE', discount: 50 }, { code: 'FESTIVAL20', discount: 20 }]);
  
  const [cart, setCart] = useState<any[]>(() => JSON.parse(localStorage.getItem('nr_cart') || '[]'));
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false); 
  const [showWalletModal, setShowWalletModal] = useState(false); 
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false); 
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [viewProduct, setViewProduct] = useState<any>(null); 
  const [adminViewCustomer, setAdminViewCustomer] = useState<any>(null);
  const [viewProofModal, setViewProofModal] = useState<string | null>(null);
  
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null); 
  const [selectedSubProduct, setSelectedSubProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [deliveryTab, setDeliveryTab] = useState<'pending' | 'history'>('pending');
  const [currentBanner, setCurrentBanner] = useState(0); 

  const [subQty, setSubQty] = useState(1);
  const [subFreq, setSubFreq] = useState<'Daily' | 'Alternate Days'>('Daily');
  const [subPayType, setSubPayType] = useState<'auto_deduct' | 'scan_deduct'>('scan_deduct');
  const [subSlot, setSubSlot] = useState<'Morning (5-7 AM)' | 'Evening (5-7 PM)'>('Morning (5-7 AM)');
  const [subInstruction, setSubInstruction] = useState<'Leave in Bag 🔕' | 'Ring Bell 🔔'>('Leave in Bag 🔕');

  const [authRoleTab, setAuthRoleTab] = useState<'customer' | 'admin'>('customer');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupReferral, setSignupReferral] = useState('');
  const [signupLat, setSignupLat] = useState<number | null>(null);
  const [signupLng, setSignupLng] = useState<number | null>(null);
  
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const [showVacationForm, setShowVacationForm] = useState<string | null>(null);
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');

  const [showModifyForm, setShowModifyForm] = useState<string | null>(null);
  const [modifyDate, setModifyDate] = useState('');
  const [modifyQty, setModifyQty] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const [proofImage, setProofImage] = useState<string | null>(null);
  const [agentLocation, setAgentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sortedDeliveryMode, setSortedDeliveryMode] = useState(false);

  const [financeStart, setFinanceStart] = useState('');
  const [financeEnd, setFinanceEnd] = useState('');

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const currentCustomer = user ? customers.find((c) => c.email === user.email || c.id === user.id) : null;
  const [newProd, setNewProd] = useState({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' });

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); assignRoleByEmail(session.user.email); }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setUser(session.user); assignRoleByEmail(session.user.email); }
      else { setUser(null); setRole('guest'); }
    });
    fetchLiveDatabaseData();

    const bannerTimer = setInterval(() => { setCurrentBanner((prev) => (prev + 1) % 2); }, 4000);
    return () => { authListener.subscription.unsubscribe(); clearInterval(bannerTimer); };
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
      if (prodData) setProducts(prodData.map((p) => ({ ...p, id: String(p.id), is_active: p.is_active !== false })));
      
      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) setCustomers(custData.map((c) => ({ ...c, id: String(c.id), walletBalance: Number(c.wallet_balance ?? 0), pending_bottles: Number(c.pending_bottles ?? 0), is_blocked: c.is_blocked === true })));
      
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (txData) setTransactions(txData);
      
      const { data: subData } = await supabase.from('subscriptions').select('*');
      if (subData) setSubscriptions(subData);

      try {
        const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (notifData) setNotifications(notifData);
      } catch (e) {}

    } catch (err) { console.error('Live Sync Error:', err); }
  };

  useEffect(() => { localStorage.setItem('nr_cart', JSON.stringify(cart)); }, [cart]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3500);
  };

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setSignupLat(pos.coords.latitude);
        setSignupLng(pos.coords.longitude);
        showToast("Location Captured 📍");
      }, () => showToast("Location denied", "error"));
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setLoginError(error.message); else { showToast('Secure Dashboard Accessed 👑'); closeModal(); }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    if (!signupName || !signupPhone || !signupAddress || !emailInput || !passwordInput) return setLoginError('Fill all required fields.');
    const { data, error } = await supabase.auth.signUp({ email: emailInput, password: passwordInput });
    if (error) setLoginError(error.message);
    else if (data.user) {
      let walletBonus = 0; let refCodeUsed = false;
      if (signupReferral) {
        const referrer = customers.find(c => c.referral_code === signupReferral.toUpperCase());
        if (referrer) {
          walletBonus = 100; refCodeUsed = true;
          await supabase.from('customers').update({ wallet_balance: Number(referrer.wallet_balance || 0) + 100 }).eq('id', referrer.id);
          await supabase.from('transactions').insert([{ customer_name: referrer.name, item: `Referral Bonus (Joined: ${signupName}) 🎉`, amount: 100 }]);
        }
      }
      const newRefCode = `NR${signupName.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
      const newCustomer: any = { 
        id: data.user.id, name: signupName, email: emailInput, phone: signupPhone, address: signupAddress, 
        wallet_balance: walletBonus, pending_bottles: 0, referral_code: newRefCode, 
        qrCode: `NR-${Math.floor(1000 + Math.random() * 9000)}`, lat: signupLat, lng: signupLng
      };
      await supabase.from('customers').insert([newCustomer]);
      if (refCodeUsed) { await supabase.from('transactions').insert([{ customer_name: signupName, item: `Welcome Referral Bonus 🎁`, amount: 100 }]); }
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
    setShowLoginModal(false); setAuthView('login'); setAuthRoleTab('customer'); setEmailInput(''); 
    setPasswordInput(''); setSignupName(''); setSignupPhone(''); setSignupAddress(''); setSignupReferral(''); 
    setSignupLat(null); setSignupLng(null); setLoginError(''); 
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || role === 'guest') { setShowSubscribeModal(false); setShowLoginModal(true); return showToast('Please login!', 'error'); }
    if (!selectedSubProduct || !currentCustomer) return;
    if (currentCustomer.is_blocked) return showToast('Account suspended. Contact support.', 'error');
    try {
      const newSub = { 
        customer_id: currentCustomer.id, customer_name: currentCustomer.name, product_name: selectedSubProduct.name, quantity: subQty, 
        price: selectedSubProduct.price * subQty, frequency: subFreq, payment_type: subPayType, status: 'Active', 
        delivery_slot: subSlot, delivery_instruction: subInstruction, modifications: {} 
      };
      await supabase.from('subscriptions').insert([newSub]);
      fetchLiveDatabaseData(); setShowSubscribeModal(false); showToast(`Subscription Started! 📅`);
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleConfirmPause = async (subId: string, productName: string) => {
    if(!vacationStart || !vacationEnd) return showToast('Please select both dates', 'error');
    try {
      await supabase.from('subscriptions').update({ status: 'Paused', pause_start: vacationStart, pause_end: vacationEnd }).eq('id', subId);
      fetchLiveDatabaseData(); setShowVacationForm(null); showToast(`Vacation set for ${productName} 🌴`);
    } catch (err: any) { alert('Pause Error: ' + err.message); }
  };

  const handleAddModification = async (sub: any) => {
    if(!modifyDate || modifyQty === '') return showToast('Enter date and quantity', 'error');
    try {
      const currentMods = sub.modifications || {};
      const updatedMods = { ...currentMods, [modifyDate]: Number(modifyQty) };
      await supabase.from('subscriptions').update({ modifications: updatedMods }).eq('id', sub.id);
      fetchLiveDatabaseData(); setShowModifyForm(null); setModifyDate(''); setModifyQty('');
      showToast(`Quantity updated for ${modifyDate}`);
    } catch(e:any) { showToast("Modification failed (Check DB Column)", "error"); }
  };

  const handleResume = async (subId: string, productName: string) => {
    try { await supabase.from('subscriptions').update({ status: 'Active', pause_start: null, pause_end: null }).eq('id', subId); fetchLiveDatabaseData(); showToast(`Delivery Resumed for ${productName} 🚀`); } catch (err: any) { alert('Resume Error: ' + err.message); }
  };

  const handleUpdateBottles = async (custId: string, current: number, delta: number) => {
    const newVal = Math.max(0, current + delta);
    try { await supabase.from('customers').update({ pending_bottles: newVal }).eq('id', custId); fetchLiveDatabaseData(); } catch (err: any) { alert("Bottle Update Error: " + err.message); }
  };

  const handleToggleBlockCustomer = async (cust: any) => {
    const newStatus = !cust.is_blocked;
    try { await supabase.from('customers').update({ is_blocked: newStatus }).eq('id', cust.id); fetchLiveDatabaseData(); showToast(newStatus ? 'Customer Blocked 🚫' : 'Customer Unblocked ✅'); setAdminViewCustomer({...cust, is_blocked: newStatus}); } catch(e:any) { alert(e.message); }
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => setProofImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMarkDelivered = async (delivery: any) => {
    if (!delivery || !delivery.cust) return;
    const cust = delivery.cust;
    
    let activeQty = delivery.quantity;
    const todayStr = new Date().toISOString().split('T')[0];
    if(delivery.modifications && delivery.modifications[todayStr] !== undefined) {
      activeQty = delivery.modifications[todayStr];
    }
    if (activeQty === 0) {
      setShowScannerModal(false); return showToast('Customer skipped delivery today.');
    }

    const amountToDeduct = Number(delivery.price / delivery.quantity) * activeQty;
    
    try {
      const payload: any = { customer_name: cust.name, item: `Delivery: ${delivery.product_name} (${activeQty} qty) [Agent: ${user.email}]`, amount: amountToDeduct };
      if(proofImage) payload.proof_image = proofImage;

      if (delivery.payment_type === 'scan_deduct') {
        if (Number(cust.wallet_balance) < amountToDeduct) return showToast(`Failed: Low balance! (₹${cust.wallet_balance})`, 'error');
        await supabase.from('customers').update({ wallet_balance: Number(cust.wallet_balance) - amountToDeduct }).eq('id', cust.id);
        await supabase.from('transactions').insert([payload]);
      } else {
        payload.amount = 0;
        payload.item = `Delivery (Auto-paid): ${delivery.product_name} (${activeQty} qty) [Agent: ${user.email}]`;
        await supabase.from('transactions').insert([payload]);
      }
      try { await supabase.from('notifications').insert([{ customer_id: cust.id, message: `Your ${delivery.product_name} was delivered! 📸`, is_read: false }]); } catch(e) {}
      fetchLiveDatabaseData(); setShowScannerModal(false); setProofImage(null); showToast(`Delivered to ${cust.name}! ✅`);
    } catch (err: any) { alert("Delivery Error: " + err.message); }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!editingProduct) return;
    try {
      const { error } = await supabase.from('products').update({ 
        name: editingProduct.name, 
        price: Number(editingProduct.price), 
        category: editingProduct.category 
      }).eq('id', editingProduct.id);
      
      if (error) throw error;
      setProducts(products.map((p) => String(p.id) === String(editingProduct.id) ? { ...p, ...editingProduct, price: Number(editingProduct.price) } : p)); 
      setEditingProduct(null); 
      showToast('Product updated successfully! ✅');
    } catch (err: any) {
      showToast("Edit Failed: " + err.message, "error");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price) return;
    try {
      const { data, error } = await supabase.from('products').insert([{ name: newProd.name, category: newProd.category, price: Number(newProd.price), original_price: Number(newProd.price) + 15, unit: newProd.unit, icon: '🌿', tag: newProd.tag, is_active: true }]).select();
      if (error) throw error;
      if (data) { setProducts([...products, { ...data[0], id: String(data[0].id) }]); setNewProd({ name: '', price: '', unit: 'Liter', category: 'Dairy', tag: 'Fresh' }); showToast('Product published!'); }
    } catch (err: any) { alert("Add Product Error: " + err.message); }
  };

  const handleToggleProductStock = async (p: any) => {
    const newStatus = !p.is_active;
    try { await supabase.from('products').update({ is_active: newStatus }).eq('id', p.id); fetchLiveDatabaseData(); showToast(newStatus ? 'Product is Back in Stock!' : 'Product marked Out of Stock!'); } catch (err: any) { alert(err.message); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try { await supabase.from('products').delete().eq('id', id); fetchLiveDatabaseData(); showToast('Product deleted!'); } catch (err: any) { alert("Delete Error: " + err.message); }
  };

  const handleSeedProducts = async () => {
    const premiumCatalog = [
      { name: 'Fresh Malai Paneer', price: 125, original_price: 140, unit: '200g', category: 'Dairy', icon: '🧀', tag: 'Fresh', is_active: true },
      { name: 'Farm Fresh Dahi', price: 85, original_price: 100, unit: '500g', category: 'Dairy', icon: '🥣', tag: 'Probiotic', is_active: true },
      { name: 'Masala Chaach', price: 45, original_price: 55, unit: '1 Liter', category: 'Dairy', icon: '🥛', tag: 'Cooling', is_active: true },
      { name: 'White Butter (Unsalted)', price: 160, original_price: 180, unit: '250g', category: 'Dairy', icon: '🧈', tag: 'Pure', is_active: true },
      { name: 'Fresh Khoya / Mawa', price: 110, original_price: 130, unit: '250g', category: 'Dairy', icon: '🍘', tag: 'Sweets', is_active: true },
      { name: 'Pure A2 Cow Milk', price: 95, original_price: 110, unit: '1 Liter', category: 'Dairy', icon: '🐄', tag: 'A2', is_active: true },
      { name: 'Pure Goat Milk', price: 150, original_price: 170, unit: '1 Liter', category: 'Dairy', icon: '🐐', tag: 'Healthy', is_active: true },
      { name: 'Desi Free-Range Eggs', price: 120, original_price: 140, unit: '6 Pack', category: 'Eggs', icon: '🥚', tag: 'Protein', is_active: true }
    ];
    const existingNames = products.map(p => p.name.toLowerCase());
    const toInsert = premiumCatalog.filter(p => !existingNames.includes(p.name.toLowerCase()));
    if (toInsert.length > 0) {
      const { error } = await supabase.from('products').insert(toInsert);
      if (error) { showToast(error.message, 'error'); } else { fetchLiveDatabaseData(); showToast(`${toInsert.length} Premium Products Added! 🚀`); }
    } else { showToast('Catalog already up to date! ✅'); }
  };

  const handleAddToCart = (product: any) => {
    if (currentCustomer?.is_blocked) return showToast('Account suspended.', 'error');
    if (!product.is_active) return showToast('Product Out of Stock!', 'error');
    const existingIndex = cart.findIndex((item) => String(item.id) === String(product.id));
    if (existingIndex > -1) { const updatedCart = [...cart]; updatedCart[existingIndex].quantity += 1; setCart(updatedCart); } 
    else setCart([...cart, { id: String(product.id), name: product.name, price: Number(product.price), unit: product.unit || 'Unit', icon: product.icon || '🌿', quantity: 1 }]);
    showToast(`Added ${product.name}`);
  };

  const handleApplyPromo = () => {
    const found = promos.find(p => p.code === promoInput.toUpperCase());
    if (found) { setAppliedDiscount(found.discount); showToast(`Promo applied! ₹${found.discount} off.`); }
    else { setAppliedDiscount(0); showToast('Invalid Promo Code', 'error'); }
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
    if (activeCustomer.is_blocked) return showToast('Account suspended.', 'error');
    const total = Math.max(0, getCartTotal() - appliedDiscount); 
    const balance = Number(activeCustomer.wallet_balance || 0);
    if (balance < total) return showToast(`Low Balance! Wallet: ₹${balance}`, 'error');

    try {
      await supabase.from('customers').update({ wallet_balance: balance - total }).eq('id', activeCustomer.id);
      const newTxs = cart.map((item) => ({ customer_name: activeCustomer.name, item: `Store Order: ${item.name}`, amount: item.price * item.quantity }));
      if (appliedDiscount > 0) newTxs.push({ customer_name: activeCustomer.name, item: `Discount Applied (${promoInput.toUpperCase()})`, amount: -appliedDiscount });
      await supabase.from('transactions').insert(newTxs);
      
      fetchLiveDatabaseData(); 
      setCart([]); 
      setAppliedDiscount(0); 
      setPromoInput(''); 
      setShowCartModal(false); 
      setOrderSuccess(true);
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

  const markNotificationsRead = async () => {
    setShowNotifModal(true);
    const unread = notifications.filter(n => n.customer_id === currentCustomer?.id && !n.is_read);
    if(unread.length > 0) { try { await supabase.from('notifications').update({ is_read: true }).eq('customer_id', currentCustomer?.id); fetchLiveDatabaseData(); } catch(e) {} }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!broadcastMsg) return;
    try {
      const notifs = customers.map(c => ({ customer_id: c.id, message: `📢 Admin: ${broadcastMsg}`, is_read: false }));
      await supabase.from('notifications').insert(notifs);
      setBroadcastMsg(''); showToast('Broadcast sent to all customers! 🚀');
    } catch(e:any) { alert(e.message); }
  };

  const filteredTx = transactions.filter(t => {
    if(!financeStart || !financeEnd) return true;
    const d = new Date(t.created_at).toISOString().split('T')[0];
    return d >= financeStart && d <= financeEnd;
  });

  const downloadExcelReport = () => {
    let csvContent = "Date,Type,Customer Name,Amount (Rs),Delivery Agent,Details\n";
    filteredTx.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString();
      const isCredit = t.item.includes('Recharge') || t.item.includes('Bonus');
      const type = isCredit ? 'Credit' : 'Debit/Delivery';
      const agentMatch = t.item.match(/\[Agent: (.*?)\]/);
      const agent = agentMatch ? agentMatch[1] : 'N/A';
      const cleanItem = t.item.replace(/"/g, '""');
      csvContent += `"${date}","${type}","${t.customer_name}","${t.amount || 0}","${agent}","${cleanItem}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `NectarRoots_Report_${new Date().toLocaleDateString().replace(/\//g,'-')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Excel Report Downloaded! 📊');
  };

  const getDispatchData = () => {
    const dispatch: Record<string, number> = {};
    const todayStr = new Date().toISOString().split('T')[0];
    subscriptions.forEach(s => {
      if(s.status === 'Active') {
        let qty = Number(s.quantity);
        if(s.modifications && s.modifications[todayStr] !== undefined) qty = Number(s.modifications[todayStr]);
        dispatch[s.product_name] = (dispatch[s.product_name] || 0) + qty; 
      }
    });
    return dispatch;
  };

  const sortDeliveriesByLocation = () => {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setAgentLocation({lat: pos.coords.latitude, lng: pos.coords.longitude});
        setSortedDeliveryMode(true);
        showToast("Sorted by nearest location 📍");
      }, () => showToast("Location denied", "error"));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; const dLat = (lat2-lat1)*(Math.PI/180); const dLon = (lon2-lon1)*(Math.PI/180);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  // 🗺️ GOOGLE MAPS AUTO-ROUTING FUNCTION
  const openGoogleMapsRoute = () => {
    if (!agentLocation) return showToast('Please Sort by Nearest first to get your location!', 'error');
    
    const validDeliveries = displaySubscriptions.filter(s => {
       const cust = customers.find(c => c.id === s.customer_id);
       return cust && cust.lat && cust.lng;
    });

    if (validDeliveries.length === 0) return showToast('No customers with location data found.', 'error');

    const waypoints = validDeliveries.slice(0, 10).map(s => {
       const cust = customers.find(c => c.id === s.customer_id);
       return `${cust?.lat},${cust?.lng}`;
    });

    const destination = waypoints.pop(); 
    const waypointsStr = waypoints.join('|');
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${agentLocation.lat},${agentLocation.lng}`;
    if (waypoints.length > 0) url += `&waypoints=${waypointsStr}`;
    if (destination) url += `&destination=${destination}`;

    window.open(url, '_blank');
  };

  // 🔥 STREAK CALCULATOR
  const calculateStreak = () => {
    if (!currentCustomer) return 0;
    const custTx = transactions.filter(t => t.customer_name === currentCustomer.name && t.item?.includes('Delivery'));
    if (custTx.length === 0) return 0;

    const dates = [...new Set(custTx.map(t => new Date(t.created_at).toISOString().split('T')[0]))].sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;

    let streak = 1;
    const today = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date(); yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split('T')[0];

    if (dates[0] !== today && dates[0] !== yesterday) return 0; // Streak broken

    let currentDate = new Date(dates[0]);
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i]);
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) { streak++; currentDate = prevDate; } 
      else { break; }
    }
    return streak;
  };

  let displaySubscriptions = subscriptions.filter(s => s.status === 'Active');
  if (sortedDeliveryMode && agentLocation) {
    displaySubscriptions = displaySubscriptions.sort((a, b) => {
      const custA = customers.find(c => c.id === a.customer_id);
      const custB = customers.find(c => c.id === b.customer_id);
      const distA = custA?.lat ? calculateDistance(agentLocation.lat, agentLocation.lng, custA.lat, custA.lng) : 9999;
      const distB = custB?.lat ? calculateDistance(agentLocation.lat, agentLocation.lng, custB.lat, custB.lng) : 9999;
      return distA - distB;
    });
  }

  const agentTransactions = transactions.filter(t => t.item?.includes(`[Agent: ${user?.email}]`));
  const filteredProducts = selectedCategory === 'All' ? products : products.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
  const userNotifications = notifications.filter(n => n.customer_id === currentCustomer?.id);
  const unreadCount = userNotifications.filter(n => !n.is_read).length;

  const banners = [
    { title: "Pure A2 Cow Milk", sub: "Straight from soil to your soul. 🌾", img: "https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=600" },
    { title: "Farm Fresh Dairy", sub: "100% Contactless Daily Service. 🛵", img: "https://images.unsplash.com/photo-1528659103995-1f9196b01476?auto=format&fit=crop&q=80&w=600" }
  ];

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#2D241E] font-sans pb-28 antialiased selection:bg-[#EBE5D9] relative overflow-x-hidden">
      
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs px-4 py-3 rounded-2xl shadow-2xl text-white font-bold text-xs text-center border transition-all ${toast.type === 'error' ? 'bg-[#8B0000] border-[#5C0000]' : 'bg-[#1E3F2D] border-[#152E20]'}`}>
          {toast.msg}
        </div>
      )}

      {(role === 'customer' || role === 'guest') && (
         <a href="https://wa.me/919999999999?text=Hi Nectar Roots," target="_blank" rel="noopener noreferrer" className="fixed bottom-24 right-4 bg-[#25D366] text-white w-14 h-14 rounded-full shadow-lg z-30 flex items-center justify-center text-3xl hover:scale-105 transition-transform">
           <span className="mb-0.5">💬</span>
         </a>
      )}

      {installPrompt && (
        <div className="bg-[#B5651D] text-white text-[10px] p-2 flex justify-between items-center px-4 font-bold sticky top-0 z-30">
          <span>📲 Install Nectar Roots App for faster access!</span>
          <button type="button" onClick={() => installPrompt.prompt()} className="bg-white text-[#B5651D] px-2 py-1 rounded shadow-sm">Install</button>
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
            <button type="button" onClick={() => setShowCartModal(true)} className="bg-[#B5651D] hover:bg-[#965216] text-white font-bold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center gap-1 shadow-md shadow-[#B5651D]/20 transition active:scale-95">
              <span>🛒</span><span className="hidden sm:inline">Cart</span><span>({getCartCount()})</span>
            </button>
          )}
          
          {(!user || role === 'guest') && (
            <button type="button" onClick={() => setShowLoginModal(true)} className="bg-[#F8F5EE]/10 hover:bg-[#F8F5EE]/20 border border-[#F8F5EE]/20 text-[#F4F0E6] font-semibold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs transition"><span className="hidden sm:inline">Login / Signup</span><span className="sm:hidden block">Login</span></button>
          )}

          {user && role === 'customer' && (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button type="button" onClick={markNotificationsRead} className="bg-[#F8F5EE]/10 border border-[#F8F5EE]/20 text-[#F4F0E6] w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95">🔔</button>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#1E3F2D] animate-bounce">{unreadCount}</span>}
              </div>

              {(currentCustomer?.wallet_balance || 0) < 200 && (
                <span className="text-[10px] bg-[#8B0000] text-white px-2 py-1 rounded-lg font-extrabold animate-pulse hidden sm:inline-block border border-[#5C0000]">Low Bal</span>
              )}
              <button type="button" onClick={() => setShowWalletModal(true)} className={`bg-[#2C523D] hover:bg-[#3A6B50] border ${((currentCustomer?.wallet_balance || 0) < 200) ? 'border-red-500 shadow-[0_0_8px_red]' : 'border-[#3A6B50]'} text-[#F4F0E6] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition active:scale-95`}>
                <span>💳</span><span>₹{currentCustomer?.wallet_balance || 0}</span>
              </button>
            </div>
          )}
          {user && (role === 'admin' || role === 'delivery') && (<button type="button" onClick={handleLogout} className="bg-[#8B0000] hover:bg-[#5C0000] text-white font-bold px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs transition border border-[#5C0000]">Exit</button>)}
        </div>
      </header>

      {(role === 'guest' || role === 'customer') && (
        <div className="bg-[#F0EBE1] border-b border-[#EBE5D9] text-center py-2 px-3 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-extrabold text-[#1E3F2D] flex justify-center items-center gap-1.5"><span className="text-sm">🌙</span> Update orders/subs by 11:00 PM for tomorrow morning delivery.</p>
        </div>
      )}

      {/* ADMIN VIEW */}
      {role === 'admin' && (
        <div className="max-w-4xl mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-gradient-to-br from-[#1E3F2D] to-[#2C523D] text-[#F4F0E6] p-4 sm:p-5 rounded-3xl shadow-lg border border-[#152E20] flex justify-between items-center">
            <div><span className="bg-[#B5651D]/20 text-[#D79A5E] border border-[#B5651D]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mb-1 inline-block">Master Dashboard</span><h1 className="font-extrabold text-base sm:text-lg text-white">Super Admin Panel</h1></div><div className="text-3xl opacity-80">⚙️</div>
          </div>
          
          <div className="bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm flex overflow-x-auto no-scrollbar gap-1.5">
            {['overview', 'dispatch', 'broadcast', 'promos', 'customers', 'products', 'delivery'].map((tab) => (
              <button key={tab} type="button" onClick={() => setAdminTab(tab as any)} className={`py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${adminTab === tab ? 'bg-[#1E3F2D] text-[#F4F0E6] font-bold shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1] font-semibold'} capitalize`}>
                <span>{tab === 'customers' ? '👥' : tab === 'products' ? '📦' : tab === 'dispatch' ? '📝' : tab === 'broadcast' ? '📢' : tab === 'delivery' ? '🛵' : tab === 'promos' ? '🏷️' : '📊'}</span> {tab}
              </button>
            ))}
          </div>

          {adminTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm"><div className="text-[10px] font-bold text-[#796C61] uppercase">Total Customers</div><div className="text-xl font-extrabold text-[#2D241E] mt-1">{customers.length}</div></div>
                <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm"><div className="text-[10px] font-bold text-[#796C61] uppercase">Active Subs</div><div className="text-xl font-extrabold text-[#2D241E] mt-1">{subscriptions.filter(s => s.status === 'Active').length}</div></div>
                <div className="bg-[#1E3F2D] p-4 rounded-3xl border border-[#152E20] shadow-md text-[#F4F0E6]"><div className="text-[10px] font-bold text-[#A5C0A0] uppercase">Wallet Liabilities</div><div className="text-xl font-extrabold text-white mt-1">₹{customers.reduce((acc, c) => acc + (Number(c.wallet_balance) || 0), 0)}</div></div>
                <div className="bg-[#B5651D] p-4 rounded-3xl border border-[#965216] shadow-md text-white"><div className="text-[10px] font-bold text-white/80 uppercase">Est. Daily Rev.</div><div className="text-xl font-extrabold mt-1">₹{subscriptions.filter(s => s.status === 'Active').reduce((acc, s) => acc + (Number(s.price) || 0), 0)}</div></div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
                <h2 className="font-bold text-sm text-[#2D241E] mb-3">📅 Filter Finance & Exports</h2>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1"><label className="text-[9px] font-bold text-[#796C61]">Start Date</label><input type="date" value={financeStart} onChange={(e)=>setFinanceStart(e.target.value)} className="w-full text-[10px] px-2 py-1.5 rounded border border-[#EBE5D9] bg-[#F8F5EE]" /></div>
                  <div className="flex-1"><label className="text-[9px] font-bold text-[#796C61]">End Date</label><input type="date" value={financeEnd} onChange={(e)=>setFinanceEnd(e.target.value)} className="w-full text-[10px] px-2 py-1.5 rounded border border-[#EBE5D9] bg-[#F8F5EE]" /></div>
                </div>
                <div className="flex justify-between items-center bg-[#F8F5EE] p-2 rounded-xl mb-3 border border-[#EBE5D9]">
                  <span className="text-[10px] font-bold text-[#796C61]">Filtered Sales: <strong className="text-[#1E3F2D]">₹{filteredTx.filter(t => !t.item.includes('Recharge') && !t.item.includes('Bonus')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)}</strong></span>
                  <span className="text-[10px] font-bold text-[#796C61]">Recharges: <strong className="text-[#B5651D]">₹{filteredTx.filter(t => t.item.includes('Recharge')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)}</strong></span>
                </div>
                <button type="button" onClick={downloadExcelReport} className="w-full bg-[#1E3F2D] hover:bg-[#152E20] text-white font-extrabold py-3 rounded-xl shadow-sm text-xs flex items-center justify-center gap-2 transition">
                  <span className="text-lg">📥</span> Download Filtered Report
                </button>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm mt-4">
                <h2 className="font-bold text-sm text-[#2D241E] mb-4">⏸️ Vacation Mode (Paused Subs)</h2>
                {subscriptions.filter(s => s.status === 'Paused').length === 0 && <div className="text-xs text-center py-6 text-[#796C61] font-medium">No deliveries are paused right now.</div>}
                {subscriptions.filter(s => s.status === 'Paused').map((s, idx) => (
                  <div key={idx} className="p-3 bg-[#8B0000]/5 rounded-2xl border border-[#8B0000]/20 mb-3 flex justify-between items-center">
                    <div>
                      <div className="font-extrabold text-xs text-[#8B0000]">{s.customer_name}</div>
                      <div className="text-[11px] text-[#796C61] mt-0.5">{s.product_name} ({s.quantity} qty)</div>
                      {(s.pause_start && s.pause_end) && (<div className="text-[9px] font-bold bg-white text-[#8B0000] px-2 py-0.5 rounded border border-[#8B0000]/20 mt-1.5 inline-block">Till: {s.pause_end}</div>)}
                    </div>
                    <span className="bg-[#8B0000] text-white text-[10px] font-bold px-2 py-1 rounded-lg">PAUSED</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'dispatch' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-1">📝 Tomorrow's Dispatch Sheet</h2>
              <p className="text-[10px] text-[#796C61] mb-4">Calculated from Active Subs & Daily Modifications</p>
              {Object.keys(getDispatchData()).length === 0 ? (
                 <div className="text-xs text-center py-8 text-[#796C61] font-medium">No active subscriptions found.</div>
              ) : (
                <div className="divide-y divide-[#EBE5D9]">
                  {Object.entries(getDispatchData()).map(([item, qty], idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div className="font-bold text-xs text-[#2D241E]">{item}</div>
                      <div className="text-xs font-extrabold text-[#B5651D] bg-[#F8F5EE] px-3 py-1 rounded-xl border border-[#EBE5D9]">{qty} Units Needed</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {adminTab === 'promos' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-2">🏷️ Active Promo Codes</h2>
              <div className="space-y-2">
                {promos.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#F8F5EE] p-3 rounded-xl border border-[#EBE5D9]">
                    <span className="font-mono text-xs font-extrabold">{p.code}</span>
                    <span className="text-[10px] bg-[#1E3F2D] text-white px-2 py-1 rounded font-bold">₹{p.discount} OFF</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'broadcast' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-2">📢 Push Notification Center</h2>
              <form onSubmit={handleBroadcast}>
                <textarea placeholder="Write your broadcast message here..." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} className="w-full text-xs p-3 bg-[#F8F5EE] rounded-xl border border-[#EBE5D9] h-24 mb-3" required />
                <button type="submit" className="w-full bg-[#1E3F2D] text-white text-xs py-3 rounded-xl font-bold">Send to All Users 🚀</button>
              </form>
            </div>
          )}

          {adminTab === 'customers' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-4">👥 Detailed Customer Data</h2>
              {customers.map((c) => (
                <div key={c.id} className={`p-4 rounded-2xl border mb-3 flex flex-col gap-3 ${c.is_blocked ? 'bg-[#8B0000]/5 border-[#8B0000]/20' : 'bg-[#F8F5EE] border-[#EBE5D9]'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-xs text-[#2D241E] flex items-center gap-2">
                        {c.name} {c.is_blocked && <span className="text-[9px] bg-[#8B0000] text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
                      </div>
                      <div className="text-[11px] text-[#796C61] mt-1 flex flex-col gap-0.5">
                        <span>📞 {c.phone}</span>
                        {c.lat && <span>📍 Lat: {c.lat.toFixed(4)}, Lng: {c.lng.toFixed(4)}</span>}
                      </div>
                      <div className="flex gap-4 items-center mt-1.5">
                        <div className="text-[11px] font-extrabold text-[#B5651D]">Wallet: ₹{c.wallet_balance || 0}</div>
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#EBE5D9]">
                          <span className="text-[10px] font-bold text-[#796C61]">🍾 Pen:</span>
                          <button type="button" onClick={() => handleUpdateBottles(c.id, c.pending_bottles, -1)} className="text-[10px] font-bold px-1.5 bg-[#F8F5EE] rounded">-</button>
                          <span className="text-[11px] font-extrabold text-[#1E3F2D]">{c.pending_bottles || 0}</span>
                          <button type="button" onClick={() => handleUpdateBottles(c.id, c.pending_bottles, 1)} className="text-[10px] font-bold px-1.5 bg-[#F8F5EE] rounded">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                       <button type="button" onClick={() => setAdminViewCustomer(c)} className="bg-white border border-[#EBE5D9] text-[#1E3F2D] text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-sm w-full">View History</button>
                       <button type="button" onClick={() => handleToggleBlockCustomer(c)} className={`${c.is_blocked ? 'bg-[#1E3F2D] text-white' : 'bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/20'} text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-sm w-full border`}>{c.is_blocked ? 'Unblock' : 'Block'}</button>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRecharge(c.id)} className="bg-[#1E3F2D] text-[#F4F0E6] text-[11px] py-2 rounded-xl font-bold w-full shadow-sm active:scale-95">+ Add ₹500 Recharge</button>
                </div>
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-sm text-[#2D241E]">📦 Live Database Inventory</h2>
                  <button type="button" onClick={handleSeedProducts} className="bg-[#B5651D] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition hover:bg-[#965216]">🌱 Auto-Add Catalog</button>
                </div>
                {products.length === 0 && <div className="text-xs text-center py-8 text-[#796C61] font-medium">Database is empty. Add a product above.</div>}
                <div className="divide-y divide-[#EBE5D9]">
                  {products.map((p) => (
                    <div key={p.id} className="py-3 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border shrink-0 ${p.is_active ? 'bg-[#F0EBE1] border-[#EBE5D9]' : 'bg-gray-100 border-gray-300 opacity-50'}`}>{p.icon || '🌿'}</div>
                        <div className="min-w-0">
                          <div className={`font-bold text-xs truncate ${p.is_active ? 'text-[#2D241E]' : 'text-gray-400 line-through'}`}>{p.name}</div>
                          <div className={`text-[11px] font-extrabold mt-0.5 ${p.is_active ? 'text-[#B5651D]' : 'text-gray-400'}`}>₹{p.price} <span className="font-medium">/ {p.unit}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => handleToggleProductStock(p)} className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition border ${p.is_active ? 'bg-white text-[#8B0000] border-[#8B0000]/20' : 'bg-[#1E3F2D] text-white border-[#1E3F2D]'}`}>{p.is_active ? '🚫 Hide' : '✅ Show'}</button>
                        <button type="button" onClick={() => setEditingProduct(p)} className="bg-[#F0EBE1] text-[#2D241E] font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition">✏️ Edit</button>
                        <button type="button" onClick={() => handleDeleteProduct(p.id)} className="bg-[#8B0000]/10 text-[#8B0000] font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'delivery' && (
            <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm">
              <h2 className="font-bold text-sm text-[#2D241E] mb-1">🛵 Today's Delivery Tracking</h2>
              <p className="text-[10px] text-[#796C61] mb-4">Live completed deliveries by agents today.</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                 {transactions.filter(t => t.item?.includes('Delivery') && new Date(t.created_at).toDateString() === new Date().toDateString()).length === 0 ? (
                    <div className="text-[11px] text-[#796C61] text-center py-6">No deliveries completed today yet.</div>
                 ) : (
                   transactions.filter(t => t.item?.includes('Delivery') && new Date(t.created_at).toDateString() === new Date().toDateString()).map((t, idx) => {
                     const agentMatch = t.item.match(/\[Agent: (.*?)\]/);
                     const agent = agentMatch ? agentMatch[1] : 'Unknown Agent';
                     const productInfo = t.item.split(' [Agent:')[0];
                     return (
                       <div key={idx} className="p-3 bg-[#F8F5EE] rounded-2xl border border-[#EBE5D9] text-xs">
                         <div className="flex justify-between items-start mb-1">
                           <div className="font-bold text-[#1E3F2D]">{productInfo}</div>
                           <div className="flex gap-2">
                             {t.proof_image && <button type="button" onClick={() => setViewProofModal(t.proof_image)} className="text-[10px] bg-white border border-[#EBE5D9] px-1.5 py-0.5 rounded">📸 Proof</button>}
                             <div className="text-[9px] font-extrabold bg-white px-2 py-0.5 rounded border border-[#EBE5D9] text-[#796C61]">{new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           </div>
                         </div>
                         <div className="text-[10px] text-[#796C61] font-medium flex justify-between">
                           <span>To: <strong className="text-[#2D241E]">{t.customer_name}</strong></span>
                           <span>By: <strong className="text-[#B5651D]">{agent.split('@')[0]}</strong></span>
                         </div>
                       </div>
                     )
                   })
                 )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELIVERY VIEW */}
      {role === 'delivery' && (
        <div className="max-w-md mx-auto p-3.5 sm:p-5 space-y-4">
          <div className="bg-gradient-to-br from-[#B5651D] to-[#965216] text-[#F4F0E6] p-4 sm:p-5 rounded-3xl shadow-lg border border-[#965216] flex justify-between items-center">
            <div><span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mb-1 inline-block">Agent: {user?.email?.split('@')[0]}</span><h1 className="font-extrabold text-base sm:text-lg text-white">Delivery Portal</h1></div><div className="text-3xl opacity-80">🛵</div>
          </div>
          <div className="bg-white p-1.5 rounded-2xl border border-[#EBE5D9] shadow-sm grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => setDeliveryTab('pending')} className={`py-2 px-3 rounded-xl text-xs transition-all font-bold ${deliveryTab === 'pending' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1]'}`}>📦 Pending</button>
            <button type="button" onClick={() => setDeliveryTab('history')} className={`py-2 px-3 rounded-xl text-xs transition-all font-bold ${deliveryTab === 'history' ? 'bg-[#1E3F2D] text-[#F4F0E6] shadow-md' : 'text-[#796C61] hover:bg-[#F0EBE1]'}`}>📜 History</button>
          </div>

          {deliveryTab === 'pending' && (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={sortDeliveriesByLocation} className="bg-white border border-[#EBE5D9] text-[#1E3F2D] text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm">📍 Sort Nearest</button>
                <button type="button" onClick={openGoogleMapsRoute} className="bg-[#1E3F2D] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">🗺️ Open Map Route</button>
              </div>

              {displaySubscriptions.length === 0 && (<div className="text-center p-8 bg-white rounded-3xl border border-[#EBE5D9] shadow-sm"><div className="text-4xl mb-2 opacity-80">🎉</div><div className="text-xs text-[#796C61] font-bold">No pending deliveries!</div></div>)}
              
              {displaySubscriptions.map((sub, idx) => {
                const cust = customers.find(c => String(c.id) === String(sub.customer_id));
                const todayStr = new Date().toISOString().split('T')[0];
                let todayQty = sub.quantity;
                if(sub.modifications && sub.modifications[todayStr] !== undefined) todayQty = sub.modifications[todayStr];
                
                if (todayQty === 0) return null;

                return (
                  <div key={idx} className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm group">
                    <div className="flex justify-between items-start">
                      <div className="font-extrabold text-sm text-[#2D241E]">{cust?.name || sub.customer_name}</div>
                      {Number(cust?.pending_bottles) > 0 && (
                        <div className="bg-[#B5651D]/10 border border-[#B5651D]/20 text-[#B5651D] px-2 py-0.5 rounded-lg text-[9px] font-extrabold">🍾 Collect: {cust.pending_bottles} Bottles</div>
                      )}
                    </div>
                    
                    <div className="text-[10px] font-medium text-[#796C61] mt-0.5 mb-2 leading-snug flex flex-col gap-0.5">
                      <span>📍 {cust?.address || 'Address not available'}</span>
                      {(agentLocation && cust?.lat) && <span className="text-[#B5651D] font-bold">📏 {calculateDistance(agentLocation.lat, agentLocation.lng, cust.lat, cust.lng).toFixed(2)} km away</span>}
                    </div>

                    <div className="flex justify-between items-center bg-[#F8F5EE] p-2.5 rounded-xl mb-3 border border-[#EBE5D9]">
                      <div className="text-xs font-bold text-[#1E3F2D]"><span>🥛</span> {sub.product_name}</div>
                      <div className="text-xs font-extrabold text-[#B5651D] bg-white px-2 py-0.5 rounded-md border border-[#EBE5D9]">{todayQty} qty</div>
                    </div>
                    <button type="button" onClick={() => { setSelectedDelivery({...sub, cust}); setShowScannerModal(true); }} className="w-full bg-[#1E3F2D] text-white py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95">Deliver</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER VIEW */}
      {(role === 'guest' || role === 'customer') && (
         <main className="max-w-md mx-auto p-3.5 sm:p-4 space-y-5">

          {/* 🔥 STREAK BADGE */}
          {user && calculateStreak() > 0 && (
            <div className="bg-gradient-to-r from-[#B5651D] to-[#965216] text-white p-3 rounded-2xl shadow-md flex items-center justify-between border border-[#965216]">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-pulse">🔥</span>
                <div>
                  <div className="font-extrabold text-sm">{calculateStreak()}-Day Pure Streak!</div>
                  <div className="text-[9px] text-white/80">Keep it up for a free healthy reward.</div>
                </div>
              </div>
            </div>
          )}

          <div className="relative w-full h-32 sm:h-40 overflow-hidden rounded-3xl shadow-md border border-[#EBE5D9]">
            {banners.map((b, idx) => (
              <div key={idx} className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} style={{backgroundImage: `url(${b.img})`}}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <h2 className="text-sm sm:text-base font-extrabold leading-tight text-white">{b.title}</h2>
                  <p className="text-[10px] sm:text-[11px] text-white/90 mt-1 font-bold tracking-wide">{b.sub}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {banners.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-4' : 'bg-white/50'}`}></div>))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-[#EBE5D9] shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-16 h-16 bg-[#F8F5EE] rounded-full flex items-center justify-center text-3xl border border-[#EBE5D9] shrink-0">🐄</div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1E3F2D] mb-1">Our Farm & Process 🌿</h3>
              <p className="text-[10px] text-[#796C61] leading-relaxed font-medium">
                At <strong className="text-[#2D241E]">Nectar Roots</strong>, we bring you 100% pure, unadulterated A2 milk straight from our free-grazing farms in Rohtak. Delivered fresh in eco-friendly glass bottles before 7 AM.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
            {['All', 'Dairy', 'Eggs', 'Ghee', 'Farm'].map((cat) => (
              <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-[#1E3F2D] text-[#F4F0E6] border-[#1E3F2D] shadow-md' : 'bg-white text-[#796C61] border-[#EBE5D9] hover:bg-[#F0EBE1]'}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-1">
            {filteredProducts.map((p) => {
              const qtyInCart = getCartQuantity(p.id);
              return (
                <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-[#EBE5D9] flex flex-col justify-between hover:shadow-md transition-all group">
                  <div onClick={() => setViewProduct(p)} className="cursor-pointer relative">
                    {!p.is_active && <div className="absolute top-0 right-0 bg-[#8B0000] text-white text-[8px] font-bold px-1.5 py-0.5 rounded z-10">Out of Stock</div>}
                    <div className={`w-12 h-12 bg-[#F8F5EE] border border-[#EBE5D9] group-hover:bg-[#F0EBE1] rounded-2xl flex items-center justify-center text-2xl mb-3 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>{p.icon || '🌿'}</div>
                    <div className={`font-bold text-xs leading-tight transition-colors ${p.is_active ? 'text-[#2D241E] group-hover:text-[#B5651D]' : 'text-gray-400'}`}>{p.name}</div>
                    <div className={`text-sm font-extrabold mt-1.5 ${p.is_active ? 'text-[#B5651D]' : 'text-gray-400'}`}>₹{p.price} <span className="text-[10px] font-medium text-[#796C61]">/ {p.unit}</span></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <button type="button" disabled={!p.is_active} onClick={() => { setSelectedSubProduct(p); setShowSubscribeModal(true); }} className={`w-full font-bold py-2 rounded-xl text-[11px] border ${p.is_active ? 'bg-[#F8F5EE] hover:bg-[#F0EBE1] text-[#1E3F2D] border-[#EBE5D9] transition-colors' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>📅 Subscribe</button>
                    {qtyInCart > 0 ? (
                      <div className="flex items-center justify-between bg-white rounded-xl p-1 border border-[#1E3F2D] shadow-sm"><button type="button" onClick={() => handleUpdateCartQuantity(p.id, -1)} className="w-7 h-7 bg-[#F8F5EE] rounded-lg font-bold text-[#2D241E]">-</button><span className="text-xs font-extrabold text-[#1E3F2D]">{qtyInCart}</span><button type="button" onClick={() => handleUpdateCartQuantity(p.id, 1)} className="w-7 h-7 bg-[#1E3F2D] text-[#F4F0E6] rounded-lg font-bold">+</button></div>
                    ) : (<button type="button" disabled={!p.is_active} onClick={() => handleAddToCart(p)} className={`w-full font-bold py-2 rounded-xl text-xs shadow-md ${p.is_active ? 'bg-[#1E3F2D] text-[#F4F0E6] active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>🛒 Add</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* --- ALL MODALS (RENDERED EXACTLY ONCE TO PREVENT CONFLICTS) --- */}
      
      {orderSuccess && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl text-center shadow-2xl max-w-sm w-full animate-slide-up border border-[#EBE5D9]">
            <div className="w-24 h-24 bg-[#1E3F2D] text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-5 shadow-lg">✅</div>
            <h2 className="font-extrabold text-2xl text-[#1E3F2D] mb-2">Order Confirmed!</h2>
            <p className="text-[11px] text-[#796C61] font-medium leading-relaxed mb-6">Thank you for choosing purity. Your order has been placed successfully and will be delivered to your doorstep.</p>
            <button type="button" onClick={() => setOrderSuccess(false)} className="w-full bg-[#1E3F2D] text-white font-extrabold py-3.5 rounded-xl shadow-md active:scale-95 transition-transform">Back to Home</button>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9] animate-slide-up max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E]">🔔 Notifications</h3>
              <button type="button" onClick={() => setShowNotifModal(false)} className="bg-white w-8 h-8 rounded-full border">✕</button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {notifications.filter(n => n.customer_id === currentCustomer?.id).length === 0 ? (
                <div className="text-center py-6 text-[10px] text-[#796C61]">No new notifications.</div>
              ) : (
                notifications.filter(n => n.customer_id === currentCustomer?.id).map((n, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-2xl border border-[#EBE5D9] shadow-sm text-xs font-bold text-[#2D241E]">{n.message}</div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showWalletModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9] animate-slide-up max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E]">💳 Wallet & Passbook</h3>
              <button type="button" onClick={() => setShowWalletModal(false)} className="bg-white w-8 h-8 rounded-full border">✕</button>
            </div>
            <div className="bg-[#1E3F2D] text-white p-5 rounded-2xl shadow-inner text-center border border-[#152E20]">
              <div className="text-[10px] font-bold text-[#A5C0A0] uppercase tracking-widest">Current Balance</div>
              <div className="text-4xl font-extrabold mt-1 tracking-tight">₹{currentCustomer?.wallet_balance || 0}</div>
            </div>
            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
              {transactions.filter(t => t.customer_name === currentCustomer?.name).map((t, idx) => (
                <div key={idx} className="p-3 bg-white rounded-2xl border border-[#EBE5D9] text-xs flex justify-between items-center shadow-sm">
                  <div className="font-bold text-[#2D241E]">{t.item.split(' [Agent:')[0]}</div>
                  <div className="font-extrabold">₹{t.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showOrdersModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9] max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE5D9]">
              <h3 className="font-extrabold text-sm text-[#2D241E]">📦 My Orders & Subs</h3>
              <button type="button" onClick={() => setShowOrdersModal(false)} className="bg-white w-8 h-8 rounded-full border">✕</button>
            </div>
            <div className="space-y-3">
               {subscriptions.filter(s => s.customer_id === currentCustomer?.id).map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-[#EBE5D9] shadow-sm">
                    <div className="font-extrabold text-[#1E3F2D]">{s.product_name} ({s.quantity})</div>
                    {s.status === 'Paused' ? (
                       <button type="button" onClick={() => handleResume(s.id, s.product_name)} className="text-[10px] bg-[#1E3F2D] text-white px-2 py-1 rounded mt-2">Resume</button>
                    ) : (
                       <button type="button" onClick={() => handleConfirmPause(s.id, s.product_name)} className="text-[10px] bg-[#F8F5EE] text-[#1E3F2D] border px-2 py-1 rounded mt-2">Pause</button>
                    )}
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {viewProofModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-white rounded-3xl p-3 max-w-sm w-full shadow-2xl">
            <button type="button" onClick={() => setViewProofModal(null)} className="absolute top-2 right-2 bg-white w-8 h-8 rounded-full">✕</button>
            <img src={viewProofModal} alt="Proof" className="w-full rounded-2xl" />
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
           <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#EBE5D9] animate-slide-up max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                 <div className="w-16 h-16 bg-white border border-[#EBE5D9] rounded-2xl flex items-center justify-center text-4xl shadow-sm">{viewProduct.icon}</div>
                 <button type="button" onClick={() => setViewProduct(null)} className="bg-white w-8 h-8 rounded-full border">✕</button>
              </div>
              <h3 className="font-extrabold text-lg text-[#2D241E]">{viewProduct.name}</h3>
              <div className="text-lg font-extrabold text-[#B5651D] mt-1">₹{viewProduct.price}</div>
              <button type="button" onClick={() => setViewProduct(null)} className="w-full bg-[#1E3F2D] text-white font-bold py-3.5 rounded-xl text-xs mt-5 active:scale-95">Close</button>
           </div>
        </div>
      )}

      {showSubscribeModal && selectedSubProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border">
            <div className="flex justify-between items-center border-b pb-3 mb-4"><h3 className="font-extrabold text-sm">🥛 Subscribe</h3><button type="button" onClick={() => setShowSubscribeModal(false)} className="bg-white w-8 h-8 rounded-full border">✕</button></div>
            <form onSubmit={handleCreateSubscription} className="space-y-5">
              <div><label className="text-[11px] font-bold text-[#796C61] uppercase block mb-2">Quantity per day</label><div className="flex items-center gap-2">{[1, 2, 3, 5].map((q) => (<button key={q} type="button" onClick={() => setSubQty(q)} className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold border ${subQty === q ? 'bg-[#1E3F2D] text-[#F4F0E6]' : 'bg-white text-[#2D241E]'}`}>{q}</button>))}</div></div>
              <button type="submit" className="w-full bg-[#1E3F2D] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs">Confirm ➔</button>
            </form>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border max-h-[95vh] overflow-y-auto">
            <div className="flex gap-1 mb-5 bg-white p-1.5 rounded-2xl border shadow-sm"><button type="button" onClick={() => setAuthRoleTab('customer')} className={`w-1/2 py-2 text-xs font-bold rounded-xl ${authRoleTab === 'customer' ? 'bg-[#1E3F2D] text-[#F4F0E6]' : 'text-[#796C61]'}`}>Customer</button><button type="button" onClick={() => setAuthRoleTab('admin')} className={`w-1/2 py-2 text-xs font-bold rounded-xl ${authRoleTab === 'admin' ? 'bg-[#1E3F2D] text-[#F4F0E6]' : 'text-[#796C61]'}`}>Admin</button></div>
            <form onSubmit={authRoleTab === 'admin' ? handleAdminLogin : (authView === 'login' ? handlePasswordLogin : handleCustomerSignup)} className="space-y-3.5">
              {authRoleTab !== 'admin' && authView === 'signup' && (<input type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border" required />)}
              <input type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border" required />
              <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full text-xs p-3 bg-white rounded-xl border" required />
              <button type="submit" className="w-full bg-[#1E3F2D] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold mt-2">Login / Sign Up</button>
            </form>
            <div className="mt-5 pt-3 text-center"><button type="button" onClick={closeModal} className="text-[10px] bg-white border px-4 py-2 rounded-full">Cancel</button></div>
          </div>
        </div>
      )}

      {/* ✅ CLEANED EDIT PRODUCT MODAL (RENDERS ONLY ONCE) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-[#EBE5D9] max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EBE5D9] pb-3">
              <h3 className="font-extrabold text-sm text-[#2D241E]">✏️ Edit Product</h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-[#796C61] hover:text-[#2D241E] font-bold bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#EBE5D9]">✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Product Name</label>
                <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] text-[#2D241E]" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Price (₹)</label>
                <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] text-[#2D241E]" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#796C61] uppercase tracking-wide">Category</label>
                <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full text-xs p-3 bg-white border border-[#EBE5D9] rounded-xl mt-1.5 focus:outline-none focus:border-[#1E3F2D] text-[#2D241E]">
                  <option value="Dairy">🥛 Dairy & Milk</option>
                  <option value="Eggs">🥚 Farm Eggs</option>
                  <option value="Ghee">🏺 Vedic Ghee</option>
                  <option value="Farm">🌱 Organic Farm</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#1E3F2D] text-[#F4F0E6] text-xs py-3.5 rounded-xl font-extrabold shadow-md mt-2">Update Product ➔</button>
            </form>
          </div>
        </div>
      )}

      {showCartModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-4 sm:p-5 max-w-sm w-full shadow-2xl flex flex-col justify-between max-h-[85vh] border">
            <div>
              <div className="flex justify-between items-center pb-3 border-b mb-4"><h3 className="font-extrabold text-sm">🛒 Cart</h3><button type="button" onClick={() => setShowCartModal(false)} className="bg-white w-8 h-8 rounded-full border">✕</button></div>
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-2xl flex items-center justify-between border shadow-sm mb-2">
                  <div className="font-bold text-xs">{item.name}</div>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-[#F8F5EE] rounded-lg font-bold">-</button><span className="text-xs font-extrabold w-3 text-center">{item.quantity}</span><button type="button" onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-[#1E3F2D] text-[#F4F0E6] rounded-lg font-bold">+</button></div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (<button type="button" onClick={handleCheckout} className="w-full bg-[#1E3F2D] text-[#F4F0E6] font-extrabold py-3.5 rounded-xl text-xs mt-4">Proceed ➔</button>)}
          </div>
        </div>
      )}

      {showScannerModal && selectedDelivery && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl border text-center max-h-[95vh] overflow-y-auto">
            <h3 className="font-extrabold text-sm mb-2">Scan & Deliver</h3>
            <button type="button" onClick={() => handleMarkDelivered(selectedDelivery)} className="w-full bg-[#1E3F2D] text-white py-3.5 rounded-xl text-xs font-extrabold mt-4">Simulate Delivery ✅</button>
            <button type="button" onClick={() => setShowScannerModal(false)} className="w-full bg-transparent text-[#796C61] py-3 rounded-xl text-xs font-bold mt-2">Cancel</button>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border">
            <h3 className="font-extrabold text-sm">Delivery QR</h3>
            <div className="text-xs font-mono font-extrabold mt-3">{currentCustomer?.qrCode}</div>
            <button type="button" onClick={() => setShowQRModal(false)} className="w-full bg-white border py-3 rounded-xl mt-2">Close</button>
          </div>
        </div>
      )}

      {adminViewCustomer && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5 z-50">
          <div className="bg-[#F8F5EE] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 border max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-extrabold text-sm">Customer Details</h3>
              <button type="button" onClick={() => setAdminViewCustomer(null)} className="bg-white w-8 h-8 rounded-full border">✕</button>
            </div>
            <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border">
              <div><strong>Email:</strong> {adminViewCustomer.email}</div>
              <div><strong>Phone:</strong> {adminViewCustomer.phone}</div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      {user && role === 'customer' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#F8F5EE]/90 backdrop-blur-xl border border-[#EBE5D9] shadow-[0_8px_30px_rgb(0,0,0,0.1)] z-40 px-4 sm:px-6 py-2.5 flex justify-between items-center rounded-3xl transition-all duration-300">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl bg-[#1E3F2D] text-[#F4F0E6] shadow-md group-active:scale-95"><span className="text-lg leading-none block">🏪</span></div><span className="text-[10px] font-extrabold text-[#1E3F2D] mt-1.5">Store</span></button>
          <button type="button" onClick={() => setShowOrdersModal(true)} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D]"><span className="text-lg leading-none block">📦</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5">Orders</span></button>
          <button type="button" onClick={() => setShowQRModal(true)} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#F0EBE1] group-hover:text-[#1E3F2D]"><span className="text-lg leading-none block">📱</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#1E3F2D] mt-1.5">QR Pass</span></button>
          <button type="button" onClick={handleLogout} className="flex flex-col items-center group relative"><div className="p-2 rounded-2xl text-[#796C61] group-hover:bg-[#8B0000]/10 group-hover:text-[#8B0000]"><span className="text-lg leading-none block">🚪</span></div><span className="text-[10px] font-bold text-[#796C61] group-hover:text-[#8B0000] mt-1.5">Logout</span></button>
        </div>
      )}
    </div>
  );
}