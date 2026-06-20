// STATE MANAGEMENT 
////////////////////////////////////////////////////////////////////////////////

const state = {
    user: null,
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    totalImpact: parseFloat(localStorage.getItem('totalImpact')) || 12847.50,
    authMode: 'login'
};

// Constants Used just for testing of the prototype websity
const DONATION_PERCENTAGE = 0.5

// DATA 
////////////////////////////////////////////////////////////////////////////////

let products = [];
let artists = [];

const MET_API =
    'https://collectionapi.metmuseum.org/public/collection/v1';


async function loadArtworks() {
    try {
        const queries = [
            "painting",
            "photograph",
            "digital",
            "print"
        ];

        let allIds = [];

        for (const q of queries) {
            const response = await fetch(
                `${MET_API}/search?q=${q}&hasImages=true`
            );

            const data = await response.json();
            if (data.objectIDs) {
                allIds.push(
                    ...data.objectIDs.slice(0, 5)
                );
            }
        }

        const ids = [
            ...new Set(allIds)
        ].slice(0, 20);

        const artworks = await Promise.all(

            ids.map(id =>
                fetch(
                    `${MET_API}/objects/${id}`
                ).then(res => res.json())
            )

        );

        const validArtworks = artworks.filter(
            art => art.primaryImageSmall
        );

        products = validArtworks.map((art, index) => ({
            id: index + 1,
            title:
                art.title || "Untitled Artwork",
            artist:
                art.artistDisplayName || "Unknown Artist",
            artistId: index + 1,
            price:
                Math.floor(Math.random() * 400) + 100,
            category:
                detectCategory(
                    art.medium,
                    art.objectName
                ),
            image:
                art.primaryImageSmall,
            badge:
                index === 0 ? "Featured" : null

        }));


        artists = validArtworks.map((art, index) => ({
            id: index + 1,
            name:
                art.artistDisplayName || "Unknown Artist",
            specialty:
                art.medium || "Fine Artist",
            location:
                art.culture || "Unknown",
            photo:
                art.primaryImageSmall,
            artworks:
                Math.floor(Math.random() * 80) + 10,
            sales:
                Math.floor(Math.random() * 300) + 20
        }));


        renderProducts();
        renderArtists();

        initScrollEffects();

    } catch (error) {
        console.error(
            "Met API error:",
            error
        );

    }

}

function detectCategory(medium, objectName) {

    const text =
        `${medium || ''} ${objectName || ''}`
            .toLowerCase();

    if (
        text.includes('photograph') ||
        text.includes('photo') ||
        text.includes('negative') ||
        text.includes('camera')
    ) {
        return "photography";

    }

    if (
        text.includes('digital') ||
        text.includes('computer')
    ) {
        return "digital";

    }

    return "painting";

}

// INITIALIZATION 
////////////////////////////////////////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', async () => {

    // load the statics first
    initAnimations();
    initScrollEffects();
    initFilters();

    animateImpactCounter();

    // then fetch the open data from the mma api
    await loadArtworks();
    updateCartUI();
});

// RENDER FUNCTIONS 
////////////////////////////////////////////////////////////////////////////////

function renderProducts(filter = 'all') {

    const grid = document.getElementById('productsGrid');

    const filtered =
        filter === 'all'
            ? products
            : products.filter(
                p => p.category === filter
            );



    grid.innerHTML = filtered.map(product =>
        ` <article class="product-card" data-category="${product.category}">

      <div class="product-image">
        ${product.badge
            ? `<span class="product-badge">${product.badge}</span>`
            : ''}
        <img 
        src="${product.image}" 
        alt="${product.title}" 
        loading="lazy">

        <div class="product-overlay">
          <button 
          class="btn btn-primary" 
          onclick="addToCart(${product.id})"> Add to Cart </button>
        </div>
      </div>

      <div class="product-info">
        <span class="product-category">
        ${product.category}
        </span>
        <h3 class="product-title">
        ${product.title}
        </h3>

        <div class="product-artist">
          <span class="artist-name">
          by ${product.artist}
          </span>
        </div>

        <div class="product-footer">
          <span class="product-price">
          €${product.price}
          </span>

          <span class="product-impact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>

            €${(product.price * DONATION_PERCENTAGE).toFixed(0)} impact
          </span>
        </div>

      </div> </article>`).join('');

}



function renderArtists() {

    const grid = document.getElementById('artistsGrid');
    grid.innerHTML = artists.map(artist =>
        ` <article class="artist-card">
      <img 
      class="artist-photo"
      src="${artist.photo}"
      alt="${artist.name}"
      loading="lazy">

      <h3>${artist.name}</h3>

      <p class="artist-specialty">
      ${artist.specialty}
      </p>

      <p class="artist-location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>

        ${artist.location}
      </p>

      <div class="artist-stats">
        <div class="artist-stat">
          <span class="artist-stat-value">
          ${artist.artworks}
          </span>
          <span class="artist-stat-label">
          Artworks
          </span>
        </div>

        <div class="artist-stat">
          <span class="artist-stat-value">
          ${artist.sales}
          </span>

          <span class="artist-stat-label">
          Sales
          </span>
        </div>
      </div></article>`).join('');

}

// CART FUNCTIONS 
////////////////////////////////////////////////////////////////////////////////

function addToCart(productId) {

    const product = products.find(
        p => p.id === productId
    );
    if (!product) return;

    state.cart.push({
        ...product,
        cartId: Date.now()
    });

    saveCart();
    updateCartUI();
    showToast(
        `"${product.title}" added to cart`,
        'success'
    );

}

function removeFromCart(cartId) {

    state.cart =
        state.cart.filter(
            item => item.cartId !== cartId
        );

    saveCart();
    updateCartUI();
    showToast(
        'Item removed from cart'
    );

}

function saveCart() {

    localStorage.setItem(
        'cart',
        JSON.stringify(state.cart)
    );

}

function updateCartUI() {

    const badge = document.getElementById('cartBadge');
    const itemsContainer = document.getElementById('cartItems');
    const emptyState = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');

    badge.textContent = state.cart.length;

    badge.classList.toggle(
        'visible',
        state.cart.length > 0
    );

    if (state.cart.length === 0) {
        itemsContainer.innerHTML = '';

        emptyState.classList.add('visible');
        footer.classList.remove('visible');
    } else {
        emptyState.classList.remove('visible');
        footer.classList.add('visible');

        itemsContainer.innerHTML =
            state.cart.map(item =>
                ` <div class="cart-item">
          <img 
          class="cart-item-image"
          src="${item.image}"
          alt="${item.title}">

          <div class="cart-item-info">
            <span class="cart-item-title">
            ${item.title}
            </span>

            <span class="cart-item-artist">
            ${item.artist}
            </span>

            <span class="cart-item-price">
            €${item.price}
            </span>
          </div>

          <button 
          class="cart-item-remove"
          onclick="removeFromCart(${item.cartId})">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>`).join('');

        const total =
            state.cart.reduce(
                (sum, item) => sum + item.price,
                0
            );

        const donation = total * DONATION_PERCENTAGE;

        document.getElementById(
            'cartDonation'
        ).textContent =
            `€${donation.toFixed(2)}`;

        document.getElementById(
            'cartTotal'
        ).textContent =
            `€${total.toFixed(2)}`;
    }

}


function openCart() {

    document.getElementById('cart')
        .classList.add('open');
    document.getElementById('cartOverlay')
        .classList.add('open');

    document.body.style.overflow = 'hidden';

}

function closeCart() {

    document.getElementById('cart')
        .classList.remove('open');
    document.getElementById('cartOverlay')
        .classList.remove('open');


    document.body.style.overflow = '';

}

// CHECKOUT FUNCTIONS 
////////////////////////////////////////////////////////////////////////////////

function openCheckout() {

    if (state.cart.length === 0) {
        showToast(
            'Your cart is empty',
            'error'
        );

        return;
    }

    closeCart();

    const checkoutItems = document.getElementById('checkoutItems');

    checkoutItems.innerHTML =
        state.cart.map(item =>
            `<div class="checkout-summary-item">
      <img src="${item.image}">
      <div class="checkout-summary-item-info">
        <span class="checkout-summary-item-title">
        ${item.title}
        </span>

        <span class="checkout-summary-item-artist">
        ${item.artist}
        </span>
      </div>

      <span class="checkout-summary-item-price">
      €${item.price}
      </span></div>`).join('');


    const total =
        state.cart.reduce(
            (sum, item) => sum + item.price,
            0
        );

    const donation = total * DONATION_PERCENTAGE;

    document.getElementById('checkoutSubtotal')
        .textContent =
        `€${total.toFixed(2)}`;
    document.getElementById('checkoutDonation')
        .textContent =
        `€${donation.toFixed(2)}`;
    document.getElementById('checkoutTotal')
        .textContent =
        `€${total.toFixed(2)}`;
    document.getElementById('checkoutModal')
        .classList.add('open');


    document.body.style.overflow = 'hidden';

}

function closeCheckout() {

    document.getElementById('checkoutModal')
        .classList.remove('open');
    document.body.style.overflow = '';

}

function completeOrder(e) {

    e.preventDefault();

    const btn = document.getElementById('checkoutBtnText');
    btn.textContent = 'Processing...';

    setTimeout(() => {
        const total =
            state.cart.reduce(
                (sum, item) => sum + item.price,
                0
            );

        const donation = total * DONATION_PERCENTAGE;

        state.totalImpact += donation;
        localStorage.setItem(
            'totalImpact',
            state.totalImpact
        );

        state.cart = [];

        saveCart();
        updateCartUI();
        closeCheckout();
        updateImpactDisplay();
        showToast(
            `Order complete! €${donation.toFixed(2)} donated to social impact`,
            'success'
        );

        btn.textContent = 'Complete Purchase';
    }, 1500);

}

// AUTH FUNCTIONS 
////////////////////////////////////////////////////////////////////////////////

function openAuth() {

    document.getElementById('authModal')
        .classList.add('open');
    document.body.style.overflow = 'hidden';

}

function closeAuth() {

    document.getElementById('authModal')
        .classList.remove('open');
    document.body.style.overflow = '';

}

function toggleAuthMode() {

    state.authMode =
        state.authMode === 'login'
            ? 'signup'
            : 'login';

    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const btnText = document.getElementById('authBtnText');
    const toggleText = document.getElementById('authToggleText');
    const toggleBtn = document.getElementById('authToggleBtn');

    if (state.authMode === 'signup') {
        title.textContent = 'Create Account';
        subtitle.textContent =
            'Join our community of art lovers';
        btnText.textContent = 'Sign Up';
        toggleText.textContent =
            'Already have an account?';
        toggleBtn.textContent = 'Sign in';
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to your account';
        btnText.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleBtn.textContent = 'Sign up';
    }

}


function handleAuth(e) {

    e.preventDefault();

    const email = document.getElementById('authEmail').value;
    state.user = { email };

    closeAuth();

    document.getElementById('authBtn')
        .innerHTML =
        ` <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
<circle cx="12" cy="7" r="4"/>
</svg>

<span class="btn-text">
${email.split('@')[0]}
</span>`;

    showToast(
        `Welcome${state.authMode === 'signup' ? '' : ' back'}!`,
        'success'
    );

}

// FORM SUBMISSIONS 
////////////////////////////////////////////////////////////////////////////////

function submitApplication(e) {

    e.preventDefault();

    showToast(
        'Application submitted successfully! We\'ll be in touch.',
        'success'
    );
    e.target.reset();

}

function subscribeNewsletter(e) {

    e.preventDefault();

    showToast(
        'Thanks for subscribing!',
        'success'
    );

    e.target.reset();
}

// TOAST NOTIFICATIONS 
////////////////////////////////////////////////////////////////////////////////

function showToast(message, type = 'default') {

    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast visible ${type}`;

    setTimeout(() => {
        toast.classList.remove('visible');

    }, 3000);

}

// FILTERS 
////////////////////////////////////////////////////////////////////////////////

function initFilters() {

    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b =>
                b.classList.remove('active')
            );

            btn.classList.add('active');

            renderProducts(
                btn.dataset.filter
            );
        });
    });

}

// SCROLL EFFECTS 
////////////////////////////////////////////////////////////////////////////////

function initScrollEffects() {

    const header = document.getElementById('header');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        header.classList.toggle(
            'scrolled',
            window.scrollY > 50
        );

        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;

            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');

            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    window.dispatchEvent(new Event('scroll'));
}

// ANIMATIONS 
////////////////////////////////////////////////////////////////////////////////

function initAnimations() {

    const observer =
        new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {

                    if (entry.isIntersecting) {
                        entry.target.classList.add(
                            'animate-in'
                        );

                        const statValues = entry.target.querySelectorAll('[data-count]');

                        statValues.forEach(el =>
                            animateCounter(el)
                        );
                    }
                });
            },
            { threshold: 0.1 });

    document
        .querySelectorAll('.section, .hero-stats')
        .forEach(el => {
            observer.observe(el);
        });

}

function animateCounter(el) {

    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {

        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(target * eased);

        if (progress < 1)
            requestAnimationFrame(update);

    }

    requestAnimationFrame(update);

}

function animateImpactCounter() {

    const el = document.getElementById('totalImpact');
    const bar = document.getElementById('impactBar');
    const target = state.totalImpact;

    const goal = 100000;

    animateValue(
        el,
        0,
        target,
        2000,
        true
    );

    setTimeout(() => {
        bar.style.width =
            `${Math.min((target / goal) * 100, 100)}%`;
    }, 500);

    // The percentages used in those calclulations are just for test usage. 
    // They do not incquire any real value or significance factor, as the platform is only in the prototype stage
    const education = target * 0.4;
    const environment = target * 0.35;
    const community = target * 0.25;

    animateValue(
        document.getElementById('impactEducation'),
        0,
        education,
        2000,
        true
    );

    animateValue(
        document.getElementById('impactEnvironment'),
        0,
        environment,
        2000,
        true
    );

    animateValue(
        document.getElementById('impactCommunity'),
        0,
        community,
        2000,
        true
    );

}

function animateValue(el, start, end, duration, decimals = false) {

    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = start + (range * eased);

        el.textContent =
            decimals
                ?
                value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                :
                Math.floor(value).toLocaleString();

        if (progress < 1)
            requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

}

function updateImpactDisplay() {

    const el = document.getElementById('totalImpact');
    const bar = document.getElementById('impactBar');
    const goal = 100000;

    el.textContent =
        state.totalImpact.toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    bar.style.width =
        `${Math.min((state.totalImpact / goal) * 100, 100)}%`;

    const education = state.totalImpact * 0.4;
    const environment = state.totalImpact * 0.35;
    const community = state.totalImpact * 0.25;

    document.getElementById('impactEducation')
        .textContent =
        education.toFixed(2);

    document.getElementById('impactEnvironment')
        .textContent =
        environment.toFixed(2);

    document.getElementById('impactCommunity')
        .textContent =
        community.toFixed(2);

}

// MOBILE MENU 
////////////////////////////////////////////////////////////////////////////////

function toggleMobileMenu() {

    const nav =
        document.getElementById('nav');
    nav.classList.toggle('open');

}