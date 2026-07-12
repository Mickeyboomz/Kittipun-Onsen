import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    addUserPoints,
    createBooking,
    getBookingsByUserId,
    createContact,
    getUserProfile
} from "./firestore.js";

// --- ON LOAD INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("scroll", handleWindowScroll);
    handleWindowScroll();

    if (window.EcommerceService) {
        initializeEcommerce();
    }

    const path = window.location.pathname.split("/").pop();
    const currentPage = path === "" ? "index.html" : path;
    const navLinks = document.querySelectorAll(".nav-menu .nav-link");
    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    const mobileToggle = document.getElementById("mobileMenuToggle");
    const navMenu = document.getElementById("navMenu");

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener("click", () => {
            navMenu.classList.toggle("open");
            const icon = mobileToggle.querySelector("i");
            if (navMenu.classList.contains("open")) {
                icon.className = "fa-solid fa-xmark";
            } else {
                icon.className = "fa-solid fa-bars";
            }
        });
    }

    const allLinks = document.querySelectorAll(".nav-link");
    allLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (navMenu) navMenu.classList.remove("open");
            if (mobileToggle) {
                const icon = mobileToggle.querySelector("i");
                icon.className = "fa-solid fa-bars";
            }
        });
    });

    window.addEventListener("click", (e) => {
        const modals = document.querySelectorAll(".modal");
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove("active");
            }
        });
    });

    const dateInput = document.getElementById("book-date");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
        dateInput.min = today;
    }

    initializeAuthState();
    updateHeaderNav();
});

function handleWindowScroll() {
    const header = document.querySelector(".header");
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }
}

function scrollToMenu(e) {
    e.preventDefault();
    const menuSec = document.getElementById("menu-gallery");
    if (menuSec) {
        window.scrollTo({
            top: menuSec.offsetTop - 100,
            behavior: "smooth"
        });
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const toastMsg = toast.querySelector(".toast-message");
    const toastIcon = toast.querySelector(".toast-icon");

    toastMsg.textContent = message;

    if (type === "success") {
        toastIcon.className = "fa-solid fa-circle-check toast-icon";
        toastIcon.style.color = "var(--accent-red)";
    } else if (type === "info") {
        toastIcon.className = "fa-solid fa-circle-info toast-icon";
        toastIcon.style.color = "#ff9800";
    }

    toast.classList.add("active");
    setTimeout(() => {
        toast.classList.remove("active");
    }, 3500);
}

function getCurrentUser() {
    const raw = localStorage.getItem("ff_current_user");
    return raw ? JSON.parse(raw) : null;
}

async function initializeEcommerce() {
    const productGrid = document.getElementById("productGrid");
    const cartItems = document.getElementById("cartItems");

    if (!productGrid || !cartItems) return;

    try {
        const products = await window.EcommerceService.getProducts();
        productGrid.innerHTML = "";

        if (!products.length) {
            productGrid.innerHTML = '<div class="empty-cart">ไม่พบสินค้าในฐานข้อมูล</div>';
            return;
        }

        products.forEach((product) => {
            const card = document.createElement("article");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${product.imageUrl || "assets/logo.png"}" alt="${product.name}">
                <div class="product-body">
                    <h4 class="product-title">${product.name}</h4>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-meta">
                        <span class="product-price">${product.price.toLocaleString()} บาท</span>
                        <span class="product-stock">คงเหลือ ${product.stock}</span>
                    </div>
                    <button class="btn btn-card" onclick="handleAddToCart('${product.id}')">เพิ่มลงตะกร้า</button>
                </div>
            `;
            productGrid.appendChild(card);
        });

        await renderCart();
    } catch (error) {
        console.error(error);
        productGrid.innerHTML = '<div class="empty-cart">ไม่สามารถโหลดสินค้าจาก Firestore ได้</div>';
    }
}

async function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const cartCount = document.getElementById("cartCount");
    const cartTotal = document.getElementById("cartTotal");
    const shippingFee = document.getElementById("shippingFee");

    if (!cartItems) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        cartItems.innerHTML = '<p class="empty-cart">กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้า</p>';
        if (cartCount) cartCount.textContent = "0";
        if (cartTotal) cartTotal.textContent = "0 บาท";
        if (shippingFee) shippingFee.textContent = "50 บาท";
        return;
    }

    try {
        const cart = await window.EcommerceService.getCart(currentUser.uid || currentUser.id);
        if (!cart.items.length) {
            cartItems.innerHTML = '<p class="empty-cart">ยังไม่มีสินค้าในตะกร้า</p>';
        } else {
            cartItems.innerHTML = "";
            cart.items.forEach((item) => {
                const row = document.createElement("div");
                row.className = "cart-item";
                row.innerHTML = `
                    <div>
                        <strong>${item.name}</strong>
                        <div>${item.quantity} x ${item.price.toLocaleString()} บาท</div>
                    </div>
                    <span>${(item.price * item.quantity).toLocaleString()} บาท</span>
                `;
                cartItems.appendChild(row);
            });
        }

        if (cartCount) cartCount.textContent = String(cart.items.reduce((sum, item) => sum + item.quantity, 0));
        if (cartTotal) cartTotal.textContent = `${Number(cart.total || 0).toLocaleString()} บาท`;
        if (shippingFee) shippingFee.textContent = `${Number(cart.shippingFee || 50).toLocaleString()} บาท`;
    } catch (error) {
        console.error(error);
        cartItems.innerHTML = '<p class="empty-cart">ไม่สามารถโหลดตะกร้าสินค้าได้</p>';
    }
}

async function handleAddToCart(productId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้า", "info");
        return;
    }

    try {
        const products = await window.EcommerceService.getProducts();
        const product = products.find((item) => item.id === productId);
        if (!product) throw new Error("PRODUCT_NOT_FOUND");

        await window.EcommerceService.addToCart(currentUser.uid || currentUser.id, product, 1);
        await renderCart();
        showToast(`${product.name} ถูกเพิ่มลงตะกร้าแล้ว`);
    } catch (error) {
        console.error(error);
        if (error.message === "OUT_OF_STOCK") {
            showToast("สินค้าหมดชั่วคราว กรุณาลองใหม่ภายหลัง", "info");
        } else if (error.message === "LOGIN_REQUIRED") {
            showToast("กรุณาเข้าสู่ระบบก่อนทำรายการ", "info");
        } else {
            showToast("ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่อีกครั้ง", "info");
        }
    }
}

async function handleCheckout() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast("กรุณาเข้าสู่ระบบก่อนชำระเงิน", "info");
        return;
    }

    try {
        await window.EcommerceService.checkout(currentUser.uid || currentUser.id, "cod");
        await renderCart();
        showToast("ชำระเงินสำเร็จและอัปเดตสต็อกเรียบร้อยแล้ว");
    } catch (error) {
        console.error(error);
        if (error.message === "EMPTY_CART") {
            showToast("ตะกร้าสินค้า empty กรุณาเพิ่มสินค้าก่อน", "info");
        } else {
            showToast("ไม่สามารถชำระเงินได้ กรุณาลองใหม่อีกครั้ง", "info");
        }
    }
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem("ff_current_user", JSON.stringify(user));
    } else {
        localStorage.removeItem("ff_current_user");
    }
}

function initializeAuthState() {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const profile = await getUserProfile(firebaseUser.uid);
                const currentUser = {
                    uid: firebaseUser.uid,
                    id: profile?.id || `FF-${firebaseUser.uid.slice(0, 8).toUpperCase()}`,
                    name: profile?.name || firebaseUser.displayName || "ผู้ใช้",
                    email: firebaseUser.email,
                    phone: profile?.phone || "",
                    points: profile?.points ?? 0,
                    role: profile?.role || "customer"
                };
                setCurrentUser(currentUser);
            } catch (error) {
                console.error("Failed to load user profile:", error);
                setCurrentUser({
                    uid: firebaseUser.uid,
                    id: `FF-${firebaseUser.uid.slice(0, 8).toUpperCase()}`,
                    name: firebaseUser.displayName || "ผู้ใช้",
                    email: firebaseUser.email,
                    phone: "",
                    points: 0,
                    role: "customer"
                });
            }
        } else {
            setCurrentUser(null);
        }

        updateHeaderNav();
    });
}

function openAuthModal(event) {
    if (event) event.preventDefault();
    document.getElementById("authModal").classList.add("active");
    switchAuthTab("login");
}

function closeAuthModal() {
    document.getElementById("authModal").classList.remove("active");
}

function switchAuthTab(tab) {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("loginForm");
    const formRegister = document.getElementById("registerForm");

    if (tab === "login") {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        formLogin.classList.add("active");
        formRegister.classList.remove("active");
    } else {
        tabLogin.classList.remove("active");
        tabRegister.classList.add("active");
        formLogin.classList.remove("active");
        formRegister.classList.add("active");
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();

    const firstname = document.getElementById("reg-firstname").value.trim();
    const lastname = document.getElementById("reg-lastname").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังบันทึก...";
    }

    try {
        const newUser = await registerUser({
            id: "FF-" + Math.floor(1000 + Math.random() * 9000),
            name: `${firstname} ${lastname}`,
            phone,
            email,
            password,
            points: 100
        });

        setCurrentUser(newUser);
        showToast(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ คุณ ${newUser.name} (รับฟรี 100 คะแนน)`);
        closeAuthModal();
        updateHeaderNav();
        e.target.reset();
    } catch (error) {
        console.error(error);
        if (error.code === "auth/email-already-in-use") {
            showToast("อีเมลนี้ได้รับการลงทะเบียนแล้ว กรุณาใช้บัญชีอื่น", "info");
        } else if (error.code === "auth/invalid-email") {
            showToast("อีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", "info");
        } else if (error.code === "auth/weak-password") {
            showToast("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "info");
        } else {
            showToast("ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง", "info");
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "สมัครสมาชิกเพื่อรับสิทธิ์ส่วนลด";
        }
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังเข้าสู่ระบบ...";
    }

    try {
        const user = await loginUser(email, password);

        if (user) {
            setCurrentUser(user);
            showToast(`ยินดีต้อนรับกลับ คุณ ${user.name}`);
            closeAuthModal();
            updateHeaderNav();
            e.target.reset();
            return;
        }
    } catch (error) {
        console.error(error);
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            showToast("อีเมลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", "info");
        } else if (error.code === "auth/invalid-email") {
            showToast("อีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", "info");
        } else {
            showToast("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง", "info");
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "เข้าสู่ระบบ";
        }
    }
}

async function handleLogout() {
    try {
        await logoutUser();
        setCurrentUser(null);
        showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
        closeMemberModal();
        updateHeaderNav();
    } catch (error) {
        console.error(error);
        showToast("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง", "info");
    }
}

function updateHeaderNav() {
    const currentUser = getCurrentUser();
    const loginLink = document.getElementById("nav-login");
    const memberLink = document.getElementById("nav-member");

    if (!loginLink || !memberLink) return;

    if (currentUser) {
        loginLink.textContent = "Logout";
        loginLink.setAttribute("onclick", "handleLogout()");
        loginLink.style.borderColor = "var(--accent-red)";
        loginLink.style.color = "var(--accent-red)";

        const displayName = currentUser.name ? currentUser.name.split(" ")[0] : "Member";
        memberLink.textContent = `Member (${displayName})`;
    } else {
        loginLink.textContent = "Register/Login";
        loginLink.setAttribute("onclick", "openAuthModal(event)");
        loginLink.style.borderColor = "var(--text-primary)";
        loginLink.style.color = "var(--text-primary)";

        memberLink.textContent = "Member";
    }
}

async function openMemberModal(event) {
    if (event) event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
        showToast("กรุณาเข้าสู่ระบบสมาชิกเพื่อดูข้อมูลของคุณ", "info");
        openAuthModal();
        return;
    }

    document.getElementById("member-name-display").textContent = currentUser.name;
    document.getElementById("member-id-display").textContent = currentUser.id;
    document.getElementById("member-points-display").textContent = currentUser.points ?? 0;

    const bookingHistoryList = document.getElementById("bookingHistoryList");
    bookingHistoryList.innerHTML = `<div class="no-bookings">กำลังโหลดประวัติการจอง...</div>`;

    document.getElementById("memberModal").classList.add("active");

    try {
        const userBookings = await getBookingsByUserId(currentUser.id);
        bookingHistoryList.innerHTML = "";

        if (userBookings.length === 0) {
            bookingHistoryList.innerHTML = `<div class="no-bookings">คุณยังไม่มีประวัติการจองที่ผ่านมา</div>`;
        } else {
            userBookings.forEach(b => {
                const item = document.createElement("div");
                item.className = "history-item";

                const details = document.createElement("div");
                details.className = "history-details";

                const serviceLabel = getServiceLabel(b.service);
                details.innerHTML = `
                    <h5>${serviceLabel} - ${b.guests} ท่าน</h5>
                    <p><i class="fa-solid fa-calendar-days"></i> วันที่ ${formatDate(b.date)} | เวลา ${b.time} น.</p>
                    <p>ราคาประมาณ: ${b.price} บาท</p>
                `;

                const status = document.createElement("div");
                status.className = "history-status status-confirmed";
                status.textContent = "Confirmed";

                item.appendChild(details);
                item.appendChild(status);
                bookingHistoryList.appendChild(item);
            });
        }
    } catch (error) {
        console.error(error);
        bookingHistoryList.innerHTML = `<div class="no-bookings">ไม่สามารถโหลดประวัติการจองได้</div>`;
    }
}

function closeMemberModal() {
    document.getElementById("memberModal").classList.remove("active");
}

function openBookingModal(serviceType) {
    const bookingModal = document.getElementById("bookingModal");
    const serviceSelect = document.getElementById("book-service");

    if (serviceSelect) {
        if (serviceType) {
            serviceSelect.value = serviceType;
        }
        updateBookingOptions();
    }

    const currentUser = getCurrentUser();
    const guestFields = document.getElementById("guest-booking-fields");

    if (currentUser) {
        if (guestFields) guestFields.style.display = "none";
        document.getElementById("book-name").removeAttribute("required");
        document.getElementById("book-phone").removeAttribute("required");
    } else {
        if (guestFields) guestFields.style.display = "block";
        document.getElementById("book-name").setAttribute("required", "true");
        document.getElementById("book-phone").setAttribute("required", "true");
    }

    bookingModal.classList.add("active");
}

function closeBookingModal() {
    document.getElementById("bookingModal").classList.remove("active");
}

function updateBookingOptions() {
    const serviceSelect = document.getElementById("book-service");
    const packageSelect = document.getElementById("book-package");
    const packageGroup = document.getElementById("package-detail-group");

    const service = serviceSelect.value;
    packageSelect.innerHTML = "";

    if (service === "sauna-onsen") {
        packageGroup.style.display = "block";
        packageSelect.innerHTML = `
            <option value="sauna-onsen-std" data-price="650">Standard: Sauna & Onsen (1.5 ชม.) - 650 บาท</option>
            <option value="sauna-onsen-full" data-price="950">Premium Day Pass (ไม่จำกัดเวลา) - 950 บาท</option>
            <option value="sauna-onsen-vip" data-price="1350">VIP: Room + Premium Set - 1,350 บาท</option>
        `;
    } else if (service === "onsen") {
        packageGroup.style.display = "block";
        packageSelect.innerHTML = `
            <option value="onsen-single" data-price="450">Standard Bathing Session (1.5 ชม.) - 450 บาท</option>
            <option value="onsen-private" data-price="850">Private Hinoki Bath (1 ชม.) - 850 บาท</option>
        `;
    } else if (service === "aroma") {
        packageGroup.style.display = "block";
        packageSelect.innerHTML = `
            <option value="aroma-60" data-price="1200">Japanese Aroma Therapy (60 นาที) - 1,200 บาท</option>
            <option value="aroma-90" data-price="1600">Japanese Aroma Therapy (90 นาที) - 1,600 บาท</option>
            <option value="aroma-120" data-price="2000">Tokusen Full Healing (120 นาที) - 2,000 บาท</option>
        `;
    } else if (service === "sauna") {
        packageGroup.style.display = "block";
        packageSelect.innerHTML = `
            <option value="sauna-std" data-price="350">Traditional Sauna Session (1.5 ชม.) - 350 บาท</option>
            <option value="sauna-löyly" data-price="500">Premium Löyly Experience - 500 บาท</option>
        `;
    } else if (service === "restaurant") {
        packageGroup.style.display = "block";
        packageSelect.innerHTML = `
            <option value="table-only" data-price="0">จองโต๊ะเฉยๆ (ชำระตามสั่งหลังมื้ออาหาร) - 0 บาท</option>
            <option value="ramen-set" data-price="300">Ramen + Drink Mini Set - 300 บาท/ท่าน</option>
            <option value="curry-set" data-price="280">Katsu Curry + Drink Mini Set - 280 บาท/ท่าน</option>
            <option value="couple-combo" data-price="690">Couple Combo Special Set - 690 บาท/เซ็ต</option>
        `;
    }

    calculateBookingSummary();

    packageSelect.onchange = calculateBookingSummary;
    document.getElementById("book-guests").onchange = calculateBookingSummary;
    document.getElementById("book-date").onchange = calculateBookingSummary;
    document.getElementById("book-time").onchange = calculateBookingSummary;
}

function calculateBookingSummary() {
    const serviceSelect = document.getElementById("book-service");
    const packageSelect = document.getElementById("book-package");
    const guestsSelect = document.getElementById("book-guests");
    const dateInput = document.getElementById("book-date");
    const timeSelect = document.getElementById("book-time");

    const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
    const packageName = packageSelect.options[packageSelect.selectedIndex]
        ? packageSelect.options[packageSelect.selectedIndex].text
        : "-";

    const pricePerGuest = packageSelect.options[packageSelect.selectedIndex]
        ? parseInt(packageSelect.options[packageSelect.selectedIndex].getAttribute("data-price"))
        : 0;
    const guestVal = guestsSelect.value;
    const guestNum = guestVal === "5+" ? 5 : parseInt(guestVal);

    let totalPrice = pricePerGuest * guestNum;
    if (serviceSelect.value === "restaurant" && packageSelect.value === "couple-combo") {
        totalPrice = pricePerGuest;
    }

    const dateVal = dateInput.value ? formatDate(dateInput.value) : "-";
    const timeVal = timeSelect.value ? timeSelect.value + " น." : "-";

    document.getElementById("summary-service").textContent = serviceName.split(" (")[0];
    document.getElementById("summary-package").textContent = packageName.split(" -")[0];
    document.getElementById("summary-datetime").textContent = `${dateVal} เวลา ${timeVal}`;
    document.getElementById("summary-price").textContent =
        totalPrice === 0 ? "ชำระหน้าเคาน์เตอร์" : totalPrice.toLocaleString() + " บาท";

    document.getElementById("bookingForm").setAttribute("data-calculated-price", totalPrice);
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const service = document.getElementById("book-service").value;
    const packageVal = document.getElementById("book-package").value;
    const date = document.getElementById("book-date").value;
    const time = document.getElementById("book-time").value;
    const guests = document.getElementById("book-guests").value;
    const notes = document.getElementById("book-notes").value.trim();
    const calculatedPrice = e.target.getAttribute("data-calculated-price") || 0;

    let bookerName = "";
    let bookerPhone = "";
    let userId = "GUEST";

    const currentUser = getCurrentUser();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังบันทึกการจอง...";
    }

    try {
        if (currentUser) {
            bookerName = currentUser.name;
            bookerPhone = currentUser.phone;
            userId = currentUser.id;

            if (currentUser.email) {
                const newPoints = await addUserPoints(currentUser.email, 50);
                if (newPoints !== null) {
                    currentUser.points = newPoints;
                    setCurrentUser(currentUser);
                }
            }
        } else {
            bookerName = document.getElementById("book-name").value.trim();
            bookerPhone = document.getElementById("book-phone").value.trim();
        }

        const bookingId = "BK-" + Math.floor(10000 + Math.random() * 90000);
        const newBooking = {
            bookingId,
            userId,
            name: bookerName,
            phone: bookerPhone,
            service,
            package: packageVal,
            date,
            time,
            guests,
            notes,
            price: calculatedPrice,
            status: "confirmed"
        };

        await createBooking(newBooking);

        let confirmMsg = `การจองสำเร็จ! รหัสการจอง: ${bookingId}`;
        if (currentUser) {
            confirmMsg += ` (ได้รับคะแนนสะสม 50 คะแนน)`;
        }

        showToast(confirmMsg);
        closeBookingModal();
        e.target.reset();

        const dateInput = document.getElementById("book-date");
        if (dateInput) {
            dateInput.value = new Date().toISOString().split("T")[0];
        }

        updateHeaderNav();
    } catch (error) {
        console.error(error);
        showToast("ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง", "info");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "ยืนยันการจองคิวออนไลน์";
        }
    }
}

function getServiceLabel(serviceKey) {
    const services = {
        "sauna-onsen": "Sauna & Onsen Combo",
        onsen: "Premium Japanese Onsen",
        aroma: "Japanese Aroma Massage",
        sauna: "Traditional Japanese Sauna",
        restaurant: "Restaurant Reservation"
    };
    return services[serviceKey] || serviceKey;
}

function formatDate(dateString) {
    if (!dateString || dateString === "-") return "-";
    const date = new Date(dateString);
    const months = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

async function handleContactSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("contact-name").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const subject = document.getElementById("contact-subject").value;
    const message = document.getElementById("contact-message").value.trim();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังส่ง...";
    }

    try {
        await createContact({ name, phone, email, subject, message });
        showToast(`ขอบคุณคุณ ${name} ที่ติดต่อเรา เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด`);
        e.target.reset();
    } catch (error) {
        console.error(error);
        showToast("ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง", "info");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "ส่งข้อความ";
        }
    }
}

Object.assign(window, {
    handleWindowScroll,
    scrollToMenu,
    showToast,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleRegisterSubmit,
    handleLoginSubmit,
    handleLogout,
    updateHeaderNav,
    openMemberModal,
    closeMemberModal,
    openBookingModal,
    closeBookingModal,
    updateBookingOptions,
    calculateBookingSummary,
    handleBookingSubmit,
    getServiceLabel,
    formatDate,
    handleContactSubmit,
    initializeEcommerce,
    renderCart,
    handleAddToCart,
    handleCheckout
});
