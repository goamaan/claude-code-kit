# Data Science Setup

Optimized for data analysis, machine learning, and Jupyter notebooks.

## Technology Stack

- **Languages**: Python, SQL, R
- **Libraries**: pandas, numpy, scikit-learn, PyTorch, TensorFlow
- **Visualization**: matplotlib, seaborn, plotly
- **Notebooks**: Jupyter, JupyterLab

## Project Structure

```
project/
  data/
    raw/          # Original, immutable data
    processed/    # Cleaned, transformed data
    external/     # Data from external sources
  notebooks/
    exploration/  # EDA notebooks
    modeling/     # Model development
    reports/      # Final analysis notebooks
  src/
    data/         # Data processing scripts
    features/     # Feature engineering
    models/       # Model training code
    visualization/ # Plotting utilities
  tests/
  requirements.txt
```

## Data Analysis Workflow

### 1. Data Understanding
- Load and inspect data shape
- Check data types and missing values
- Compute summary statistics
- Identify data quality issues

### 2. Exploratory Data Analysis (EDA)
- Univariate analysis (distributions)
- Bivariate analysis (correlations)
- Create visualizations
- Document findings

### 3. Data Preparation
- Handle missing values
- Encode categorical variables
- Scale numerical features
- Split into train/test sets

### 4. Modeling
- Start with simple baselines
- Iterate on feature engineering
- Cross-validate model performance
- Document experiments

## Jupyter Notebook Best Practices

### Cell Organization
- One logical step per cell
- Keep cells focused and small
- Add markdown headers for sections
- Document assumptions and decisions

### Reproducibility
- Set random seeds
- Record library versions
- Use relative paths
- Clear outputs before committing

### Code Quality
- Extract reusable functions to .py files
- Use type hints where helpful
- Write docstrings for functions
- Keep notebooks < 500 lines

## Statistical Analysis

### Hypothesis Testing
- State null and alternative hypotheses
- Choose appropriate test (t-test, chi-square, etc.)
- Check test assumptions
- Report effect sizes with p-values

### Visualization Guidelines
- Always label axes
- Include units where applicable
- Use colorblind-friendly palettes
- Add titles and legends

## Machine Learning

### Evaluation Metrics
- Classification: accuracy, precision, recall, F1, AUC
- Regression: MAE, MSE, RMSE, R-squared
- Use cross-validation for reliable estimates
- Report confidence intervals

### Model Selection
- Start simple (linear models, trees)
- Use cross-validation for comparison
- Consider model interpretability
- Document model assumptions
