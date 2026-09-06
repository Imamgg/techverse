document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const productGrid = document.getElementById("product-grid");
  const categoryFiltersContainer = document.getElementById(
    "category-filters-container",
  );
  const searchInput = document.getElementById("product-search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const sortSelect = document.getElementById("sort-select");
  const resultsCountText = document.getElementById("results-count-text");
  const emptyState = document.getElementById("empty-state");
  const emptyDescText = document.getElementById("empty-desc-text");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  const errorState = document.getElementById("error-state");
  const retryFetchBtn = document.getElementById("retry-fetch-btn");
  const statTotalProducts = document.getElementById("stat-total-products");
  const apiStatusEl = document.getElementById("api-status");

  // Modal Elements
  const productModal = document.getElementById("product-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalDismissBtn = document.getElementById("modal-dismiss-btn");
  const modalImage = document.getElementById("modal-image");
  const modalCategory = document.getElementById("modal-category");
  const modalRatingScore = document.getElementById("modal-rating-score");
  const modalRatingCount = document.getElementById("modal-rating-count");
  const modalSku = document.getElementById("modal-sku");
  const modalTitle = document.getElementById("modal-title");
  const modalPrice = document.getElementById("modal-price");
  const modalDescription = document.getElementById("modal-description");
  const modalViewApiBtn = document.getElementById("modal-view-api-btn");

  // Application State
  const state = {
    products: [],
    categories: [],
    selectedCategory: "all",
    searchQuery: "",
    sortOrder: "default",
    isLoading: false,
    selectedProduct: null,
  };

  // Category labels dictionary for Indonesian localization
  const categoryDictionary = {
    electronics: "Elektronik",
    jewelery: "Perhiasan",
    "men's clothing": "Pakaian Pria",
    "women's clothing": "Pakaian Wanita",
  };

  /**
   * Helper: Format category names to Indonesian
   */
  function formatCategoryName(category) {
    return categoryDictionary[category] || category;
  }

  // Kurs konversi USD ke IDR
  const USD_TO_IDR_RATE = 17000;

  /**
   * Helper: Konversi dan format harga USD ke Rupiah (IDR)
   */
  function formatRupiah(usdPrice) {
    const idr = Math.round(Number(usdPrice) * USD_TO_IDR_RATE);
    return idr.toLocaleString("id-ID");
  }

  /**
   * Helper: Render skeleton placeholder cards
   */
  function renderSkeletons(count = 8) {
    productGrid.innerHTML = "";
    const skeletonHtml = Array.from({ length: count })
      .map(
        () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-box skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton-box skeleton-tag"></div>
          <div class="skeleton-box skeleton-title"></div>
          <div class="skeleton-box skeleton-desc-1"></div>
          <div class="skeleton-box skeleton-desc-2"></div>
          <div class="skeleton-footer">
            <div class="skeleton-box skeleton-price"></div>
            <div class="skeleton-box skeleton-button"></div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    productGrid.innerHTML = skeletonHtml;
    emptyState.hidden = true;
    errorState.hidden = true;
    productGrid.hidden = false;
  }

  /**
   * Fetch categories from FakeStoreAPI
   */
  async function fetchCategories() {
    try {
      const response = await fetch(
        "https://fakestoreapi.com/products/categories",
      );
      if (!response.ok) throw new Error("Gagal memuat kategori");
      const categories = await response.json();
      state.categories = categories;
      renderCategoryFilters();
    } catch (error) {
      console.warn(
        "Gagal memuat kategori dinamis, menggunakan kategori default:",
        error,
      );
      state.categories = [
        "electronics",
        "jewelery",
        "men's clothing",
        "women's clothing",
      ];
      renderCategoryFilters();
    }
  }

  /**
   * Render Category Filter Pills
   */
  function renderCategoryFilters() {
    categoryFiltersContainer.innerHTML = "";

    // "All" chip
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = `category-chip ${state.selectedCategory === "all" ? "active" : ""}`;
    allButton.dataset.category = "all";
    allButton.role = "tab";
    allButton.setAttribute("aria-selected", state.selectedCategory === "all");
    allButton.innerHTML = `<span class="chip-icon">✦</span> Semua Produk`;
    allButton.addEventListener("click", () => handleCategoryChange("all"));
    categoryFiltersContainer.appendChild(allButton);

    // Each API category chip
    state.categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `category-chip ${state.selectedCategory === cat ? "active" : ""}`;
      btn.dataset.category = cat;
      btn.role = "tab";
      btn.setAttribute("aria-selected", state.selectedCategory === cat);
      btn.innerHTML = `<span class="chip-icon">◈</span> ${formatCategoryName(cat)}`;
      btn.addEventListener("click", () => handleCategoryChange(cat));
      categoryFiltersContainer.appendChild(btn);
    });
  }

  /**
   * Handle category filter selection
   */
  function handleCategoryChange(category) {
    if (state.selectedCategory === category) return;
    state.selectedCategory = category;

    // Update active class on chips
    const chips = categoryFiltersContainer.querySelectorAll(".category-chip");
    chips.forEach((chip) => {
      const isSelected = chip.dataset.category === category;
      chip.classList.toggle("active", isSelected);
      chip.setAttribute("aria-selected", isSelected);
    });

    applyFiltersAndRender();
  }

  /**
   * Fetch all products from FakeStoreAPI
   */
  async function fetchProducts() {
    state.isLoading = true;
    renderSkeletons(8);
    resultsCountText.textContent = "Menghubungkan ke FakeStore API...";

    try {
      const response = await fetch("https://fakestoreapi.com/products");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      state.products = data;
      state.isLoading = false;

      // Update stats
      if (statTotalProducts) {
        statTotalProducts.textContent = data.length;
      }

      // Update API status banner
      if (apiStatusEl) {
        apiStatusEl.innerHTML = `
          <span class="status-indicator"></span>
          <span class="status-label">API Aktif (${data.length} Item)</span>
        `;
      }

      applyFiltersAndRender();
    } catch (error) {
      console.error("Error fetching products:", error);
      state.isLoading = false;
      productGrid.hidden = true;
      emptyState.hidden = true;
      errorState.hidden = false;
      resultsCountText.textContent = "Gagal memuat data";

      if (apiStatusEl) {
        apiStatusEl.innerHTML = `
          <span class="status-indicator" style="background-color: #EF4444; box-shadow: 0 0 8px #EF4444;"></span>
          <span class="status-label">Koneksi API Gagal</span>
        `;
      }
    }
  }

  /**
   * Filter and Sort Products based on current state
   */
  function applyFiltersAndRender() {
    if (state.isLoading) return;

    let results = [...state.products];

    // 1. Filter by category
    if (state.selectedCategory !== "all") {
      results = results.filter(
        (product) => product.category === state.selectedCategory,
      );
    }

    // 2. Filter by search query
    const query = state.searchQuery.trim().toLowerCase();
    if (query) {
      results = results.filter(
        (product) =>
          product.title.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query),
      );
    }

    // 3. Sort results
    switch (state.sortOrder) {
      case "price-asc":
        results.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        results.sort((a, b) => b.price - a.price);
        break;
      case "rating-desc":
        results.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
        break;
      case "title-asc":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "default":
      default:
        results.sort((a, b) => a.id - b.id);
        break;
    }

    // 4. Update UI results counter
    updateResultsCounter(results.length, query);

    // 5. Render cards or empty state
    if (results.length === 0) {
      productGrid.hidden = true;
      emptyState.hidden = false;
      errorState.hidden = true;

      if (query) {
        emptyDescText.textContent = `Tidak ada produk yang cocok dengan kata kunci "${state.searchQuery}". Silakan coba kata kunci lain.`;
      } else {
        emptyDescText.textContent = `Tidak ada produk yang tersedia dalam kategori ini saat ini.`;
      }
    } else {
      productGrid.hidden = false;
      emptyState.hidden = true;
      errorState.hidden = true;
      renderProductCards(results);
    }
  }

  /**
   * Update the result count text
   */
  function updateResultsCounter(count, query) {
    if (query) {
      resultsCountText.innerHTML = `Ditemukan <strong>${count}</strong> produk untuk "<em>${escapeHtml(query)}</em>"`;
    } else if (state.selectedCategory !== "all") {
      resultsCountText.innerHTML = `Menampilkan <strong>${count}</strong> produk di kategori <strong>${formatCategoryName(state.selectedCategory)}</strong>`;
    } else {
      resultsCountText.innerHTML = `Menampilkan <strong>${count}</strong> dari total <strong>${state.products.length}</strong> produk`;
    }
  }

  /**
   * Render Product Cards into the grid
   */
  function renderProductCards(items) {
    productGrid.innerHTML = "";

    const fragment = document.createDocumentFragment();

    items.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Lihat detail ${product.title}`);

      const ratingRate = product.rating
        ? Number(product.rating.rate).toFixed(1)
        : "4.0";
      const ratingCount = product.rating ? product.rating.count : 0;
      const formattedCategory = formatCategoryName(product.category);

      card.innerHTML = `
        <div class="card-media-wrapper">
          <span class="card-category-badge">${formattedCategory}</span>
          <img 
            src="${product.image}" 
            alt="${escapeHtml(product.title)}" 
            class="card-product-img" 
            loading="lazy"
          >
        </div>
        <div class="card-content">
          <div class="card-meta-row">
            <div class="card-rating-badge">
              <span>★</span>
              <span>${ratingRate}</span>
              <span class="card-reviews-count">(${ratingCount})</span>
            </div>
          </div>
          <h3 class="card-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>
          <p class="card-description-preview">${escapeHtml(product.description)}</p>
          <div class="card-footer-row">
            <div class="card-price-container">
              <span class="price-currency">Rp</span>
              <span class="price-value">${formatRupiah(product.price)}</span>
            </div>
            <button type="button" class="view-detail-button" aria-label="Lihat detail produk">
              <span>Detail</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Open Modal Event
      card.addEventListener("click", () => openProductModal(product));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProductModal(product);
        }
      });

      fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);
  }

  /**
   * Open Quick View Modal with product details
   */
  function openProductModal(product) {
    state.selectedProduct = product;

    modalImage.src = product.image;
    modalImage.alt = product.title;
    modalCategory.textContent = formatCategoryName(product.category);
    modalRatingScore.textContent = product.rating
      ? Number(product.rating.rate).toFixed(1)
      : "4.5";
    modalRatingCount.textContent = product.rating
      ? `(${product.rating.count} ulasan)`
      : "(0 ulasan)";
    modalSku.textContent = `SKU: #FK-${product.id.toString().padStart(4, "0")}`;
    modalTitle.textContent = product.title;
    modalPrice.textContent = formatRupiah(product.price);
    modalDescription.textContent = product.description;

    // API link handler
    modalViewApiBtn.onclick = () => {
      window.open(
        `https://fakestoreapi.com/products/${product.id}`,
        "_blank",
        "noopener,noreferrer",
      );
    };

    productModal.hidden = false;
    // Trigger transition
    requestAnimationFrame(() => {
      productModal.classList.add("active");
    });

    // Prevent body scrolling
    document.body.style.overflow = "hidden";
    modalCloseBtn.focus();
  }

  /**
   * Close Quick View Modal
   */
  function closeProductModal() {
    productModal.classList.remove("active");
    setTimeout(() => {
      productModal.hidden = true;
      document.body.style.overflow = "";
      state.selectedProduct = null;
    }, 280);
  }

  /**
   * Debounce helper function
   */
  function debounce(func, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Helper: Escape HTML special characters
   */
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Search Input with Debounce
  const handleSearchDebounced = debounce((e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.hidden = !state.searchQuery;
    applyFiltersAndRender();
  }, 250);

  searchInput.addEventListener("input", (e) => {
    clearSearchBtn.hidden = !e.target.value;
    handleSearchDebounced(e);
  });

  // Clear Search Button
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    clearSearchBtn.hidden = true;
    searchInput.focus();
    applyFiltersAndRender();
  });

  // Sort Dropdown
  sortSelect.addEventListener("change", (e) => {
    state.sortOrder = e.target.value;
    applyFiltersAndRender();
  });

  // Reset Filters Button
  resetFiltersBtn.addEventListener("click", () => {
    state.searchQuery = "";
    searchInput.value = "";
    clearSearchBtn.hidden = true;
    state.sortOrder = "default";
    sortSelect.value = "default";
    handleCategoryChange("all");
  });

  // Retry Fetch Button
  retryFetchBtn.addEventListener("click", () => {
    fetchCategories();
    fetchProducts();
  });

  // Modal Close Events
  modalCloseBtn.addEventListener("click", closeProductModal);
  modalDismissBtn.addEventListener("click", closeProductModal);

  // Close Modal on Backdrop Click
  productModal.addEventListener("click", (e) => {
    if (
      e.target === productModal ||
      e.target.classList.contains("modal-dialog-container")
    ) {
      closeProductModal();
    }
  });

  // Keyboard accessibility: ESC key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !productModal.hidden) {
      closeProductModal();
    }
  });

  fetchCategories();
  fetchProducts();
});
