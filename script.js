const WORKER_URL = "https://williamguesby09-prj-loreal-routine-builder.947hzftrzm.workers.dev";

const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const sendBtn = document.getElementById("sendBtn");

let selectedProducts = [];
let currentProducts = [];
let busy = false;

productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

async function loadProducts() {
  const response = await fetch("products.json");

  if (!response.ok) {
    throw new Error("Unable to load products.");
  }

  const data = await response.json();
  return data.products;
}

function isSelected(product) {
  return selectedProducts.some(
    p => p.name === product.name && p.brand === product.brand
  );
}

function displayProducts(products) {
  productsContainer.innerHTML = "";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.cursor = "pointer";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const brand = document.createElement("p");
    brand.textContent = product.brand;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = isSelected(product)
      ? "Remove Product"
      : "Select Product";

    info.append(name, brand, button);
    card.append(image, info);

    card.addEventListener("click", () => {
      if (isSelected(product)) {
        selectedProducts = selectedProducts.filter(
          p => p.name !== product.name ||
               p.brand !== product.brand
        );
      } else {
        selectedProducts.push(product);
      }

      updateSelectedProducts();
      displayProducts(currentProducts);
    });

    productsContainer.appendChild(card);
  });
}

function updateSelectedProducts() {
  selectedProductsList.innerHTML = "";

  if (!selectedProducts.length) {
    selectedProductsList.textContent = "No products selected.";
    return;
  }

  selectedProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "selected-product";

    const name = document.createElement("span");
    name.textContent = product.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";

    remove.addEventListener("click", () => {
      selectedProducts = selectedProducts.filter(
        p => p.name !== product.name ||
             p.brand !== product.brand
      );

      updateSelectedProducts();
      displayProducts(currentProducts);
    });

    item.append(name, remove);
    selectedProductsList.appendChild(item);
  });
}

categoryFilter.addEventListener("change", async event => {
  try {
    const products = await loadProducts();

    currentProducts = products.filter(
      product => product.category === event.target.value
    );

    displayProducts(currentProducts);
  } catch (error) {
    productsContainer.textContent = error.message;
  }
});

function addMessage(role, message) {
  const element = document.createElement("div");

  element.className = `chat-message ${role}`;
  element.style.whiteSpace = "pre-wrap";
  element.style.marginBottom = "12px";

  element.textContent =
    (role === "user" ? "You: " : "L'Oréal Advisor: ") +
    message;

  chatWindow.appendChild(element);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return element;
}

async function askAI(message) {
  if (busy) return;

  busy = true;
  generateRoutine.disabled = true;
  sendBtn.disabled = true;

  addMessage("user", message);

  const loading = addMessage(
    "assistant",
    "Creating your personalized response..."
  );

  try {
    const response = await fetch(`${WORKER_URL}/api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        products: selectedProducts.map(product => ({
          name: product.name,
          brand: product.brand,
          category: product.category
        }))
      })
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Cloudflare returned a non-JSON response (HTTP ${response.status}). Check the Worker backend.`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    if (typeof data.reply !== "string") {
      throw new Error("The Worker did not return an AI reply.");
    }

    loading.remove();
    addMessage("assistant", data.reply);

  } catch (error) {
    loading.remove();
    addMessage("assistant", `Error: ${error.message}`);

  } finally {
    busy = false;
    generateRoutine.disabled = false;
    sendBtn.disabled = false;
  }
}

generateRoutine.addEventListener("click", () => {
  if (!selectedProducts.length) {
    addMessage(
      "assistant",
      "Please select at least one product first."
    );
    return;
  }

  askAI(
    "Create a personalized beauty routine using my selected products. Explain the correct order, frequency, and how to use each product."
  );
});

chatForm.addEventListener("submit", event => {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message || busy) return;

  userInput.value = "";
  askAI(message);
});

updateSelectedProducts();
