// --- ON LOAD INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Scroll events for sticky header & active nav links
    window.addEventListener("scroll", handleWindowScroll);
    handleWindowScroll(); // Run once on load
    
    // Mobile navigation toggle
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

    // Close menu when clicking navigation link on mobile
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (navMenu) navMenu.classList.remove("open");
            if (mobileToggle) {
                const icon = mobileToggle.querySelector("i");
                icon.className = "fa-solid fa-bars";
            }
        });
    });

    // Close modal clicking outside content
    window.addEventListener("click", (e) => {
        const modals = document.querySelectorAll(".modal");
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove("active");
            }
        });
    });

    // Set today as default date in booking form
    const dateInput = document.getElementById("book-date");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
        dateInput.min = today;
    }

    // Initialize mock user data if empty
    if (!localStorage.getItem("ff_users")) {
        localStorage.setItem("ff_users", JSON.stringify([]));
    }
    if (!localStorage.getItem("ff_bookings")) {
        localStorage.setItem("ff_bookings", JSON.stringify([]));
    }

    // Update login status header display
    updateHeaderNav();
});

// --- HEADER SCROLL & SECTION HIGHLIGHTING ---
function handleWindowScroll() {
    const header = document.querySelector(".header");
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }

    // Highlight menu links based on scroll position
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-menu .nav-link");
    let currentSectionId = "home";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSectionId = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        if (link.getAttribute("href") === `#${currentSectionId}`) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

// Scroll to Menu helper for restaurant section link
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

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
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

// --- AUTH MODAL SYSTEM (LOGIN / REGISTRATION) ---
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

function handleRegisterSubmit(e) {
    e.preventDefault();
    const firstname = document.getElementById("reg-firstname").value.trim();
    const lastname = document.getElementById("reg-lastname").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;

    const users = JSON.parse(localStorage.getItem("ff_users"));
    
    // Check if email already registered
    if (users.some(user => user.email === email)) {
        showToast("อีเมลนี้ได้รับการลงทะเบียนแล้ว กรุณาใช้บัญชีอื่น", "info");
        return;
    }

    const newUser = {
        id: "FF-" + Math.floor(1000 + Math.random() * 9000),
        name: `${firstname} ${lastname}`,
        phone: phone,
        email: email,
        password: password,
        points: 100 // welcome points
    };

    users.push(newUser);
    localStorage.setItem("ff_users", JSON.stringify(users));
    localStorage.setItem("ff_current_user", JSON.stringify(newUser));

    showToast(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ คุณ ${newUser.name} (รับฟรี 100 คะแนน)`);
    closeAuthModal();
    updateHeaderNav();
    e.target.reset();
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    const users = JSON.parse(localStorage.getItem("ff_users"));
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem("ff_current_user", JSON.stringify(user));
        showToast(`ยินดีต้อนรับกลับ คุณ ${user.name}`);
        closeAuthModal();
        updateHeaderNav();
        e.target.reset();
    } else {
        // Simple demo fallback - if user is empty, create a dummy session
        if (email === "demo@demo.com" || email === "admin@fridayfunny.com") {
            const demoUser = {
                id: "FF-9827",
                name: "คุณ สมาชิกทดสอบ (Demo)",
                phone: "089-999-9999",
                email: email,
                points: 350
            };
            localStorage.setItem("ff_current_user", JSON.stringify(demoUser));
            showToast("เข้าสู่ระบบด้วยบัญชีทดสอบเรียบร้อย!");
            closeAuthModal();
            updateHeaderNav();
            e.target.reset();
        } else {
            showToast("อีเมลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", "info");
        }
    }
}

function handleLogout() {
    localStorage.removeItem("ff_current_user");
    showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
    closeMemberModal();
    updateHeaderNav();
}

function updateHeaderNav() {
    const currentUser = JSON.parse(localStorage.getItem("ff_current_user"));
    const loginLink = document.getElementById("nav-login");
    const memberLink = document.getElementById("nav-member");

    if (currentUser) {
        loginLink.textContent = "Logout";
        loginLink.setAttribute("onclick", "handleLogout()");
        loginLink.style.borderColor = "var(--accent-red)";
        loginLink.style.color = "var(--accent-red)";
        
        memberLink.textContent = `Member (${currentUser.name.split(" ")[0]})`;
    } else {
        loginLink.textContent = "Register/Login";
        loginLink.setAttribute("onclick", "openAuthModal(event)");
        loginLink.style.borderColor = "var(--text-primary)";
        loginLink.style.color = "var(--text-primary)";
        
        memberLink.textContent = "Member";
    }
}

// --- MEMBER DASHBOARD MODAL SYSTEM ---
function openMemberModal(event) {
    if (event) event.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem("ff_current_user"));

    if (!currentUser) {
        showToast("กรุณาเข้าสู่ระบบสมาชิกเพื่อดูข้อมูลของคุณ", "info");
        openAuthModal();
        return;
    }

    // Populate Member UI
    document.getElementById("member-name-display").textContent = currentUser.name;
    document.getElementById("member-id-display").textContent = currentUser.id;
    document.getElementById("member-points-display").textContent = currentUser.points;

    // Load History
    const bookingHistoryList = document.getElementById("bookingHistoryList");
    bookingHistoryList.innerHTML = "";

    const bookings = JSON.parse(localStorage.getItem("ff_bookings"));
    const userBookings = bookings.filter(b => b.userId === currentUser.id);

    if (userBookings.length === 0) {
        bookingHistoryList.innerHTML = `<div class="no-bookings">คุณยังไม่มีประวัติการจองที่ผ่านมา</div>`;
    } else {
        // Reverse order (newest first)
        userBookings.reverse().forEach(b => {
            const item = document.createElement("div");
            item.className = "history-item";
            
            const details = document.createElement("div");
            details.className = "history-details";
            
            let serviceLabel = getServiceLabel(b.service);
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

    document.getElementById("memberModal").classList.add("active");
}

function closeMemberModal() {
    document.getElementById("memberModal").classList.remove("active");
}

// --- BOOKING SYSTEM SYSTEM ---
function openBookingModal(serviceType) {
    const bookingModal = document.getElementById("bookingModal");
    const serviceSelect = document.getElementById("book-service");

    if (serviceSelect) {
        if (serviceType) {
            serviceSelect.value = serviceType;
        }
        updateBookingOptions();
    }

    // Auto-fill user details if logged in
    const currentUser = JSON.parse(localStorage.getItem("ff_current_user"));
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

// Update package selection and calculations based on selected service
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

    // Force recalculate summary
    calculateBookingSummary();

    // Bind change events to recalculate dynamically
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
    const packageName = packageSelect.options[packageSelect.selectedIndex] ? packageSelect.options[packageSelect.selectedIndex].text : "-";
    
    const pricePerGuest = packageSelect.options[packageSelect.selectedIndex] ? parseInt(packageSelect.options[packageSelect.selectedIndex].getAttribute("data-price")) : 0;
    const guestVal = guestsSelect.value;
    const guestNum = guestVal === "5+" ? 5 : parseInt(guestVal);
    
    // Total price logic
    let totalPrice = pricePerGuest * guestNum;
    if (serviceSelect.value === "restaurant" && packageSelect.value === "couple-combo") {
        // couple combo is a set price, not per-guest
        totalPrice = pricePerGuest;
    }

    const dateVal = dateInput.value ? formatDate(dateInput.value) : "-";
    const timeVal = timeSelect.value ? timeSelect.value + " น." : "-";

    document.getElementById("summary-service").textContent = serviceName.split(" (")[0];
    document.getElementById("summary-package").textContent = packageName.split(" -")[0];
    document.getElementById("summary-datetime").textContent = `${dateVal} เวลา ${timeVal}`;
    document.getElementById("summary-price").textContent = totalPrice === 0 ? "ชำระหน้าเคาน์เตอร์" : totalPrice.toLocaleString() + " บาท";
    
    // Store price in hidden attribute for final submit reference
    document.getElementById("bookingForm").setAttribute("data-calculated-price", totalPrice);
}

function handleBookingSubmit(e) {
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

    const currentUser = JSON.parse(localStorage.getItem("ff_current_user"));
    
    if (currentUser) {
        bookerName = currentUser.name;
        bookerPhone = currentUser.phone;
        userId = currentUser.id;
        
        // Award points to logged in user for booking (e.g. 50 points per booking)
        const users = JSON.parse(localStorage.getItem("ff_users"));
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].points += 50;
            localStorage.setItem("ff_users", JSON.stringify(users));
            currentUser.points += 50;
            localStorage.setItem("ff_current_user", JSON.stringify(currentUser));
        }
    } else {
        bookerName = document.getElementById("book-name").value.trim();
        bookerPhone = document.getElementById("book-phone").value.trim();
    }

    const newBooking = {
        bookingId: "BK-" + Math.floor(10000 + Math.random() * 90000),
        userId: userId,
        name: bookerName,
        phone: bookerPhone,
        service: service,
        package: packageVal,
        date: date,
        time: time,
        guests: guests,
        notes: notes,
        price: calculatedPrice,
        createdAt: new Date().toISOString()
    };

    const bookings = JSON.parse(localStorage.getItem("ff_bookings")) || [];
    bookings.push(newBooking);
    localStorage.setItem("ff_bookings", JSON.stringify(bookings));

    let confirmMsg = `การจองสำเร็จ! รหัสการจอง: ${newBooking.bookingId}`;
    if (currentUser) {
        confirmMsg += ` (ได้รับคะแนนสะสม 50 คะแนน)`;
    }

    showToast(confirmMsg);
    closeBookingModal();
    
    // Reset form fields
    e.target.reset();
    
    // Reset date picker to today
    const dateInput = document.getElementById("book-date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }

    // Refresh member dashboard header if open
    updateHeaderNav();
}

// --- HELPERS ---
function getServiceLabel(serviceKey) {
    const services = {
        "sauna-onsen": "Sauna & Onsen Combo",
        "onsen": "Premium Japanese Onsen",
        "aroma": "Japanese Aroma Massage",
        "sauna": "Traditional Japanese Sauna",
        "restaurant": "Restaurant Reservation"
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
    const year = date.getFullYear() + 543; // convert to Thai Buddhist year
    return `${day} ${month} ${year}`;
}
