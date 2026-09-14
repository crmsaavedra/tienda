const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
let cart = JSON.parse(localStorage.getItem("ap-cart") || "[]");
let coupon = localStorage.getItem("ap-coupon") || "";

async function api(url, options = {}) { 
    const r = await fetch(url, { 
        headers: { 
            "Content-Type": "application/json", 
            ...(localStorage.apToken && { Authorization: `Bearer ${localStorage.apToken}` }), 
            ...options.headers 
        }, 
        ...options 
    }); 
    const data = r.status === 204 ? null : await r.json(); 
    if (!r.ok) throw new Error(data.error || "Error"); 
    return data; 
}

function toggleLoader(show, text = "Procesando...") {
    const loader = $("#global-loader");
    $("#loader-text").textContent = text;
    if (show) loader.classList.add("active");
    else loader.classList.remove("active");
}

async function loadCart() {
    if (!cart.length) {
        window.location.href = "/";
        return;
    }
    
    try {
        const quote = await api("/api/orders/quote", { 
            method: "POST", 
            body: JSON.stringify({ 
                items: cart.map(x => ({ partId: x.partId, qty: x.qty })), 
                discountCode: coupon 
            }) 
        });
        
        $("#checkout-items").innerHTML = quote.items.map(x => `
            <div class="cart-item">
                <div>
                    <strong>${x.name}</strong><br>
                    <small>${money(x.unitPrice)} c/u x ${x.qty}</small>
                </div>
                <strong>${money(x.unitPrice * x.qty)}</strong>
            </div>
        `).join("");
        
        $("#subtotal").textContent = money(quote.subtotal);
        if (quote.discount) {
            $("#discount-row").style.display = "flex";
            $("#discount-code").textContent = quote.discount.code;
            $("#discount").textContent = "-" + money(quote.discount.amount);
        }
        $("#total").textContent = money(quote.total);
        
    } catch (e) {
        alert("Error cargando el carrito: " + e.message);
        window.location.href = "/";
    }
}

async function initAuth() {
    if (localStorage.apToken) {
        try {
            const user = JSON.parse(atob(localStorage.apToken.split(".")[1]));
            if (user.exp * 1000 > Date.now()) {
                $("#name").value = user.name || "";
                $("#email").value = user.email || "";
                if (user.rut) $("#rut").value = user.rut;
                if (user.phone) $("#phone").value = user.phone;
                if (user.address) $("#address").value = user.address;
                $("#password-group").style.display = "none";
                $("#password").removeAttribute("required");
                return;
            }
        } catch(e) {}
    }
}

$("#checkout-form").onsubmit = async (e) => {
    e.preventDefault();
    toggleLoader(true, "Iniciando pago seguro...");
    
    try {
        const fd = new FormData(e.target);
        const authBody = Object.fromEntries(fd);

        if (!localStorage.apToken || $("#password-group").style.display !== "none") {
            try {
                const data = await api("/api/auth/login", { 
                    method: "POST", 
                    body: JSON.stringify({ email: authBody.email, password: authBody.password }) 
                });
                localStorage.apToken = data.token;
            } catch (err) {
                // If login fails, try register
                const regData = await api("/api/auth/register", { 
                    method: "POST", 
                    body: JSON.stringify(authBody) 
                });
                localStorage.apToken = regData.token;
            }
        }
        
        const user = JSON.parse(atob(localStorage.apToken.split(".")[1]));
        const checkoutData = await api("/api/orders/checkout", { 
            method: "POST", 
            body: JSON.stringify({ 
                items: cart.map(x => ({ partId: x.partId, qty: x.qty })), 
                discountCode: coupon, 
                customerInfo: { 
                    name: $("#name").value, 
                    email: $("#email").value,
                    rut: $("#rut").value,
                    phone: $("#phone").value,
                    address: $("#address").value
                } 
            }) 
        });
        
        window.location.assign(checkoutData.checkoutUrl);
    } catch (err) {
        toggleLoader(false);
        alert(err.message || "No se pudo procesar el pago");
    }
};

loadCart();
initAuth();

