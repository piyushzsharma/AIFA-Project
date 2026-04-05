# AIFA — AI-Driven Distillation Column Controller
### Minimax & Alpha-Beta Pruning for Robust Process Optimization

> **Course Project — Artificial Intelligence Foundation and Application**  
> **Team MAPS**

---

## Overview

This project applies **Minimax game theory** with **Alpha-Beta Pruning** to solve the problem of robust distillation column control under adversarial feed disturbances. The controller searches ahead through a tree of possible control decisions to find the sequence of operating parameters that guarantees the best worst-case product purity and energy efficiency.

The core idea is modelling the control problem as a **two-player zero-sum game**:
- **MAX player** (controller) — chooses Reflux ratio, Heat duty, and Temperature to *maximise* product utility
- **MIN player** (environment) — simulates worst-case feed disturbances to *minimise* utility

---

## Algorithm

### Process Model

The distillation column is described by two empirical equations:

**Product Purity:**
```
purity = 0.82 + 0.15·tanh(R − 2) − 0.5·|F − 0.5| − 0.01·(T − 78)²
```

**Energy Consumption:**
```
energy = Q + 80·R + 0.5·|T − 78|
```

Where:
| Symbol | Variable | Typical Range |
|--------|----------|---------------|
| `R` | Reflux Ratio | 1.0 – 4.0 |
| `Q` | Heat Duty (kW) | 300 – 700 |
| `T` | Column Temperature (°C) | 70 – 90 |
| `F` | Feed Flowrate | 0.1 – 1.0 |

**Utility Function (objective to maximise):**
```
U = 120·purity − 0.07·energy + penalty
penalty = −200·(0.88 − purity)  if purity < 0.88, else 0
```
The penalty term enforces a hard constraint: purity must stay above 88%.

**Feed Disturbance Model (first-order lag):**
```
F_new = 0.6·F_prev + 0.4·disturbance
```

---

### Pure Minimax

The standard Minimax algorithm performs a full depth-first search over the game tree:

```python
def minimax(depth, is_max, state):
    if depth == 0:
        return utility(*simulate(*state)), [state]

    if is_max:
        best = -inf
        for r, q, t in control_space:
            val, path = minimax(depth-1, False, (r, q, t, F))
            best = max(best, val)
        return best, best_path
    else:
        worst = +inf
        for d in feed_disturbances:
            F_new = update_feed(F, d)
            val, path = minimax(depth-1, True, (R, Q, T, F_new))
            worst = min(worst, val)
        return worst, worst_path
```

- **Time complexity:** O(b^d) where b = branching factor, d = depth
- **No pruning** — every node in the tree is evaluated

---

### Minimax with Alpha-Beta Pruning

Alpha-Beta Pruning eliminates branches that cannot affect the final decision, significantly reducing the number of nodes evaluated without changing the result:

```python
def minimax_alpha_beta(depth, is_max, state, alpha, beta):
    if depth == 0:
        return utility(*simulate(*state)), [state]

    if is_max:
        best = -inf
        for r, q, t in control_space:
            val, path = minimax_alpha_beta(depth-1, False, state, alpha, beta)
            best = max(best, val)
            alpha = max(alpha, best)
            if beta <= alpha:
                break  # β-cutoff — MIN won't allow this branch
        return best, best_path
    else:
        worst = +inf
        for d in feed_disturbances:
            val, path = minimax_alpha_beta(depth-1, True, state, alpha, beta)
            worst = min(worst, val)
            beta = min(beta, worst)
            if beta <= alpha:
                break  # α-cutoff — MAX won't allow this branch
        return worst, worst_path
```

**Key insight:** `α` (alpha) is the best value MAX can guarantee so far; `β` (beta) is the best value MIN can guarantee. If `β ≤ α`, the current branch is provably irrelevant and is pruned.

---

### Performance Comparison

The script runs both algorithms on identical inputs and compares:

| Metric | Standard Minimax | Alpha-Beta Pruning |
|--------|------------------|--------------------|
| Nodes Evaluated | High (full tree) | Significantly reduced |
| Effective Branching Factor | Higher | Lower |
| Peak Memory Usage | Tracked via `tracemalloc` | Tracked via `tracemalloc` |
| Runtime | Baseline | Faster |
| Final Utility Value |  Identical |  Identical |

Both algorithms **always produce the same optimal path** — Alpha-Beta only prunes branches that are provably irrelevant to the final result.

The script also performs a **depth scaling analysis** (depths 2, 4, 6, 8) to demonstrate how node counts and runtimes grow with search depth, visualised with Plotly.

---

## Project Structure

```
AIFA/
│
├── main_model_script/
│   └── model.py            ← Core algorithm (Python, runs in Google Colab)
│
├── web_page/               ← Interactive visualisation dashboard
│   ├── src/
│   │   ├── algorithm/
│   │   │   └── minimax.ts  ← Algorithm ported to TypeScript
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TreeCanvas.tsx
│   │   │   └── TreeCanvasRaw.tsx
│   │   └── styles/
│   │       └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Running the Algorithm (Python)

The main script `model.py` was developed in **Google Colab** and can be run directly there.

**Dependencies:**
```bash
pip install numpy matplotlib networkx plotly
```

**Run:**
```bash
python model.py
```

**Output:**
- Optimal state transitions at each time step (R, Q, T, F)
- Final utility score
- Node count and runtime for both algorithms
- Minimax decision tree visualisation (NetworkX + Matplotlib)
- Grouped bar chart comparison (Plotly)
- Depth scaling analysis plots (Plotly)

---

## Interactive Web Dashboard

A companion web dashboard built with **React + TypeScript + Vite** allows you to:
- Configure initial column state and parameter search ranges
- Run both Pure Minimax and Alpha-Beta side-by-side in the browser
- View the full decision tree interactively (collapsible or global network view)
- Inspect the optimal state transition table and performance metrics in real time

**To run locally:**
```bash
cd web_page
npm install
npm run dev
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Core Algorithm | Python (NumPy, NetworkX, Plotly) |
| Web Dashboard | React, TypeScript, Vite |
| Tree Visualisation | D3 Hierarchy, react-d3-tree |
| Original Notebook | Google Colab |

---

## Key Takeaways

1. Minimax provides a **mathematically guaranteed** optimal control strategy under worst-case disturbances.
2. Alpha-Beta Pruning achieves the **same result** as pure Minimax while evaluating far fewer nodes.
3. The utility function with a purity **penalty term** acts as a soft constraint, correctly biasing the controller to maintain product quality even at higher energy cost.
4. The **depth scaling analysis** empirically confirms the theoretical complexity difference between O(b^d) and O(b^(d/2)) in favourable cases.
