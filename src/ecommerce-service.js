(function (global) {
    const firebaseConfig = {
        apiKey: "AIzaSyDv_LwrGUnOn2WuekBK2rgW_D6pIWkbQNo",
        authDomain: "onsenfridayfunny.firebaseapp.com",
        projectId: "onsenfridayfunny",
        storageBucket: "onsenfridayfunny.firebasestorage.app",
        messagingSenderId: "202780568348",
        appId: "1:202780568348:web:d1e5acd345d9f66d7e68d9",
        measurementId: "G-F218EQTBBW"
    };

    let firebaseApp = null;
    let firestoreDb = null;

    function ensureFirebase() {
        if (!global.firebase) {
            throw new Error("Firebase SDK is not loaded");
        }

        if (!firebaseApp) {
            if (!global.firebase.apps || global.firebase.apps.length === 0) {
                firebaseApp = global.firebase.initializeApp(firebaseConfig);
            } else {
                firebaseApp = global.firebase.apps[0];
            }
        }

        if (!firestoreDb) {
            firestoreDb = global.firebase.firestore();
        }

        return firestoreDb;
    }

    function normalizeProduct(doc) {
        const data = doc.data();
        return {
            id: doc.id,
            productId: data.productId || doc.id,
            name: data.name || "สินค้า",
            description: data.description || "",
            price: Number(data.price || 0),
            stock: Number(data.stock || 0),
            category: data.category || "general",
            imageUrl: data.imageUrl || "",
            isActive: data.isActive !== false
        };
    }

    async function seedProductsIfNeeded() {
        const db = ensureFirebase();
        const snapshot = await db.collection("products").limit(1).get();
        if (!snapshot.empty) return;

        const sampleProducts = [
            {
                productId: "prod_onsen_tea",
                name: "Japanese Green Tea Set",
                description: "ชุดน้ำชาสมุนไพรญี่ปุ่นพร้อมขนมหวานสไตล์ญี่ปุ่น",
                price: 320,
                stock: 18,
                category: "drink",
                imageUrl: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=900&q=80",
                isActive: true,
                createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                productId: "prod_hinoki_soap",
                name: "Hinoki Aroma Soap",
                description: "สบู่หอมระเหยจากไม้สนญี่ปุ่นสำหรับผ่อนคลาย",
                price: 280,
                stock: 12,
                category: "wellness",
                imageUrl: "https://images.unsplash.com/photo-1608571424352-9261a1e1e7c9?auto=format&fit=crop&w=900&q=80",
                isActive: true,
                createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                productId: "prod_onsen_robe",
                name: "Onsen Robe Premium",
                description: "ผ้าคลุมผ่อนคลายสำหรับออนเซ็นและซาวน่า",
                price: 1250,
                stock: 8,
                category: "lifestyle",
                imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
                isActive: true,
                createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
            }
        ];

        const batch = db.batch();
        sampleProducts.forEach((product) => {
            const ref = db.collection("products").doc();
            batch.set(ref, product);
        });
        await batch.commit();
    }

    async function getProducts() {
        const db = ensureFirebase();
        await seedProductsIfNeeded();
        const snapshot = await db.collection("products")
            .where("isActive", "==", true)
            .orderBy("createdAt", "desc")
            .get();

        return snapshot.docs.map(normalizeProduct);
    }

    async function getPendingOrder(userId) {
        const db = ensureFirebase();
        const snapshot = await db.collection("orders")
            .where("userId", "==", userId)
            .where("status", "==", "pending")
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const orderDoc = snapshot.docs[0];
        return {
            id: orderDoc.id,
            ...orderDoc.data()
        };
    }

    async function saveCart(userId, items) {
        const db = ensureFirebase();
        const existing = await getPendingOrder(userId);

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + 50;
        const payload = {
            userId,
            status: "pending",
            paymentStatus: "unpaid",
            items,
            subtotal,
            shippingFee: 50,
            total,
            updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
        };

        if (existing && existing.id) {
            await db.collection("orders").doc(existing.id).update(payload);
            return existing.id;
        }

        const created = await db.collection("orders").add({
            ...payload,
            createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
        });
        return created.id;
    }

    async function getCart(userId) {
        const order = await getPendingOrder(userId);
        if (!order) {
            return { id: null, items: [], subtotal: 0, shippingFee: 50, total: 50 };
        }

        return {
            id: order.id,
            items: order.items || [],
            subtotal: Number(order.subtotal || 0),
            shippingFee: Number(order.shippingFee || 50),
            total: Number(order.total || 0)
        };
    }

    async function addToCart(userId, product, quantity = 1) {
        if (!userId) {
            throw new Error("LOGIN_REQUIRED");
        }

        const existingCart = await getCart(userId);
        const items = [...(existingCart.items || [])];
        const index = items.findIndex((item) => item.productId === product.id);

        if (index >= 0) {
            items[index].quantity += quantity;
            items[index].subtotal = items[index].price * items[index].quantity;
        } else {
            items.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity,
                subtotal: product.price * quantity
            });
        }

        if (product.stock < quantity) {
            throw new Error("OUT_OF_STOCK");
        }

        return saveCart(userId, items);
    }

    async function checkout(userId, paymentMethod = "cod") {
        const db = ensureFirebase();
        const pendingOrder = await getPendingOrder(userId);
        if (!pendingOrder) {
            throw new Error("EMPTY_CART");
        }

        const orderRef = db.collection("orders").doc(pendingOrder.id);
        const orderData = pendingOrder;

        const batch = db.batch();
        orderData.items.forEach((item) => {
            const productRef = db.collection("products").doc(item.productId);
            batch.update(productRef, {
                stock: global.firebase.firestore.FieldValue.increment(-item.quantity),
                updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        batch.update(orderRef, {
            status: "paid",
            paymentStatus: "paid",
            paymentMethod,
            paymentHistory: global.firebase.firestore.FieldValue.arrayUnion({
                method: paymentMethod,
                paidAt: new Date().toISOString()
            }),
            updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        return true;
    }

    global.EcommerceService = {
        getProducts,
        getCart,
        addToCart,
        checkout,
        saveCart,
        getPendingOrder
    };
})(window);