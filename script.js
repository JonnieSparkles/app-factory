// Recipe data
const recipeData = {
    title: "Turkey & Mushroom Meatloaf",
    servings: 5,
    prepTime: 20,
    cookTime: 50,
    totalTime: 70,
    ingredients: [
        { amount: "1 lb", name: "ground turkey (93% lean preferred)" },
        { amount: "8 oz", name: "mushrooms (white or cremini), finely chopped" },
        { amount: "1 small", name: "onion, finely diced" },
        { amount: "2 cloves", name: "garlic, minced" },
        { amount: "1 tbsp", name: "olive oil" },
        { amount: "1/2 cup", name: "breadcrumbs (plain or seasoned)" },
        { amount: "1/4 cup", name: "milk" },
        { amount: "1 large", name: "egg, lightly beaten" },
        { amount: "2 tbsp", name: "ketchup, plus more for topping" },
        { amount: "1 tbsp", name: "Worcester sauce" },
        { amount: "1 tsp", name: "Dijon mustard (or substitute yellow mustard)" },
        { amount: "1 tsp", name: "salt" },
        { amount: "1/2 tsp", name: "black pepper" },
        { amount: "1/2 tsp", name: "dried thyme (optional)" }
    ],
    instructions: [
        "Preheat the oven to 375°F (190°C). Line a baking sheet or loaf pan with parchment paper or lightly grease it.",
        "Cook the vegetables: In a medium skillet, heat olive oil over medium heat. Add the onions and mushrooms and cook for 6–8 minutes, until the mushrooms release their moisture and the mixture looks mostly dry. Stir in garlic and cook for 30 seconds more. Remove from heat and let cool slightly.",
        "Combine ingredients: In a large mixing bowl, combine the cooled mushroom mixture with ground turkey, breadcrumbs, milk, egg, ketchup, Worcester sauce, Dijon mustard, salt, pepper, and thyme. Mix gently until just combined — do not overmix.",
        "Shape the loaf: Transfer the mixture to the prepared pan and shape into a loaf. Brush the top with a thin layer of ketchup for a classic glaze.",
        "Bake: Bake for 45–55 minutes, or until the internal temperature reaches 165°F (74°C).",
        "Rest and serve: Let the meatloaf rest for 10 minutes before slicing. Serve warm, optionally topped with extra ketchup or mushroom gravy."
    ]
};

// Global variables
let currentServings = recipeData.servings;
let timerInterval = null;
let timeRemaining = 0;

// DOM elements
const servingInput = document.getElementById('serving-input');
const decreaseBtn = document.getElementById('decrease-servings');
const increaseBtn = document.getElementById('increase-servings');
const startTimerBtn = document.getElementById('start-timer');
const stopTimerBtn = document.getElementById('stop-timer');
const timerDisplay = document.getElementById('timer-display');
const timerText = document.getElementById('timer-text');
const ingredientsList = document.getElementById('ingredients-list');
const instructionsList = document.getElementById('instructions-list');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeRecipe();
    setupEventListeners();
});

function initializeRecipe() {
    // Set initial serving input value
    servingInput.value = currentServings;
    
    // Populate ingredients
    populateIngredients();
    
    // Populate instructions
    populateInstructions();
    
    // Update meta information
    updateMetaInfo();
}

function populateIngredients() {
    ingredientsList.innerHTML = '';
    
    recipeData.ingredients.forEach(ingredient => {
        const li = document.createElement('li');
        li.className = 'ingredient-item';
        
        const scaledAmount = scaleIngredient(ingredient.amount, currentServings);
        
        li.innerHTML = `
            <span class="ingredient-amount">${scaledAmount}</span>
            <span class="ingredient-name">${ingredient.name}</span>
        `;
        
        ingredientsList.appendChild(li);
    });
}

function populateInstructions() {
    instructionsList.innerHTML = '';
    
    recipeData.instructions.forEach((instruction, index) => {
        const li = document.createElement('li');
        li.className = 'instruction-item';
        
        const span = document.createElement('span');
        span.className = 'instruction-text';
        span.textContent = instruction;
        
        li.appendChild(span);
        instructionsList.appendChild(li);
    });
}

function scaleIngredient(amount, servings) {
    // Simple scaling logic - this could be more sophisticated
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        // Handle fractions and text amounts
        if (amount.includes('1/2')) {
            const scaled = (0.5 * servings / recipeData.servings).toFixed(1);
            return scaled === '1.0' ? '1' : scaled;
        } else if (amount.includes('1/4')) {
            const scaled = (0.25 * servings / recipeData.servings).toFixed(1);
            return scaled === '1.0' ? '1' : scaled;
        } else if (amount.includes('1/3')) {
            const scaled = (0.33 * servings / recipeData.servings).toFixed(1);
            return scaled === '1.0' ? '1' : scaled;
        }
        return amount; // Return original for complex amounts
    }
    
    const scaled = (numericAmount * servings / recipeData.servings).toFixed(1);
    const unit = amount.replace(numericAmount.toString(), '').trim();
    
    if (scaled === '1.0' && unit) {
        return '1 ' + unit;
    }
    
    return scaled + (unit ? ' ' + unit : '');
}

function updateMetaInfo() {
    document.getElementById('servings').textContent = currentServings;
    document.getElementById('prep-time').textContent = recipeData.prepTime;
    document.getElementById('cook-time').textContent = recipeData.cookTime;
    
    const totalMinutes = recipeData.prepTime + recipeData.cookTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    document.getElementById('total-time').textContent = totalTimeText;
}

function setupEventListeners() {
    // Serving adjustment
    decreaseBtn.addEventListener('click', () => {
        if (currentServings > 1) {
            currentServings--;
            servingInput.value = currentServings;
            updateRecipe();
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        if (currentServings < 20) {
            currentServings++;
            servingInput.value = currentServings;
            updateRecipe();
        }
    });
    
    servingInput.addEventListener('change', (e) => {
        const newServings = parseInt(e.target.value);
        if (newServings >= 1 && newServings <= 20) {
            currentServings = newServings;
            updateRecipe();
        } else {
            e.target.value = currentServings;
        }
    });
    
    // Timer controls
    startTimerBtn.addEventListener('click', startTimer);
    stopTimerBtn.addEventListener('click', stopTimer);
}

function updateRecipe() {
    populateIngredients();
    updateMetaInfo();
}

function startTimer() {
    // Set timer to cook time (50 minutes)
    timeRemaining = recipeData.cookTime * 60; // Convert to seconds
    
    startTimerBtn.style.display = 'none';
    timerDisplay.style.display = 'flex';
    
    // Add active class for animation
    timerDisplay.classList.add('timer-active');
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            stopTimer();
            showTimerComplete();
        }
    }, 1000);
    
    updateTimerDisplay();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    startTimerBtn.style.display = 'block';
    timerDisplay.style.display = 'none';
    timerDisplay.classList.remove('timer-active');
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showTimerComplete() {
    // Create a notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-bell" style="margin-right: 0.5rem;"></i>
        Cooking time is complete! 🎉
    `;
    
    document.body.appendChild(notification);
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 5000);
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to recipe meta items
    const metaItems = document.querySelectorAll('.meta-item');
    metaItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click animation to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Space bar to start/stop timer
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (timerDisplay.style.display === 'none') {
            startTimer();
        } else {
            stopTimer();
        }
    }
    
    // Escape to stop timer
    if (e.code === 'Escape' && timerDisplay.style.display !== 'none') {
        stopTimer();
    }
});

// Add service worker for offline functionality (basic implementation)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // This would be implemented for full offline functionality
        console.log('Service Worker support detected');
    });
}