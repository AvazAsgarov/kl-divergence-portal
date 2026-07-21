import os
import sys
import numpy as np
import pandas as pd
import scipy.stats as stats
import matplotlib.pyplot as plt
import seaborn as sns

# Reconfigure stdout to support UTF-8 characters in terminal output if needed
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class DataDriftDetector:
    """
    Data drift detector that evaluates shifts in probability distributions
    using Kullback-Leibler (KL) Divergence.
    """
    def __init__(self, threshold=0.1, n_bins=30):
        """
        Initializes the detector with threshold and binning parameters.
        
        Args:
            threshold (float): KL Divergence threshold to flag data drift.
            n_bins (int): Number of bins to convert continuous data into PMF.
        """
        self.threshold = threshold
        self.n_bins = n_bins

    def _convert_to_pmf(self, baseline_data, current_data):
        """
        Bins continuous data over a shared range and converts it into discrete
        probability mass functions (PMF).
        """
        # Determine shared range boundaries for binning
        min_val = min(np.min(baseline_data), np.min(current_data))
        max_val = max(np.max(baseline_data), np.max(current_data))
        
        # Create uniformly spaced bins
        bins = np.linspace(min_val, max_val, self.n_bins + 1)
        
        # Calculate raw frequency counts
        p_hist, _ = np.histogram(baseline_data, bins=bins)
        q_hist, _ = np.histogram(current_data, bins=bins)
        
        # Normalize to form probability distributions (csum = 1)
        p_pmf = p_hist / np.sum(p_hist)
        q_pmf = q_hist / np.sum(q_hist)
        
        # Apply Laplace Smoothing to resolve the "Zero Probability" problem,
        # preventing division by zero and infinite divergence results.
        epsilon = 1e-9
        p_pmf = (p_pmf + epsilon) / np.sum(p_pmf + epsilon)
        q_pmf = (q_pmf + epsilon) / np.sum(q_pmf + epsilon)
        
        return p_pmf, q_pmf

    def calculate_kl_divergence(self, p, q):
        """
        Calculates the KL divergence between two discrete probability distributions.
        Uses the standard scipy.stats.entropy function.
        
        Args:
            p (array-like): Baseline/True distribution (P)
            q (array-like): Current/Approximate distribution (Q)
        """
        return stats.entropy(p, q)

    def detect_drift(self, baseline, current):
        """
        Compares baseline and current datasets to detect if distribution drift occurred.
        """
        p_pmf, q_pmf = self._convert_to_pmf(baseline, current)
        
        # Calculate KL divergence in both directions to demonstrate asymmetry
        kl_p_q = self.calculate_kl_divergence(p_pmf, q_pmf)
        kl_q_p = self.calculate_kl_divergence(q_pmf, p_pmf)
        
        is_drifted = kl_p_q > self.threshold
        
        return {
            'kl_p_q': kl_p_q,
            'kl_q_p': kl_q_p,
            'is_drifted': is_drifted,
            'threshold': self.threshold
        }

    def plot_and_save(self, baseline, current, result, scenario_name, filepath):
        """
        Plots the overlay of both distributions with drift details and saves as a PNG.
        Uses Seaborn for a clean aesthetic.
        """
        sns.set_theme(style="white")
        
        plt.figure(figsize=(10, 6))
        
        # Plot Baseline (P) and Current (Q) densities
        sns.histplot(baseline, bins=self.n_bins, color='#3b82f6', label='Baseline Data (P)', 
                     stat='density', alpha=0.35, kde=True, edgecolor=None)
        sns.histplot(current, bins=self.n_bins, color='#f59e0b', label='Current Data (Q)', 
                     stat='density', alpha=0.35, kde=True, edgecolor=None)
        
        # Clean up borders for a minimalist design
        sns.despine(left=True, bottom=True)
        
        plt.title(f'Data Drift Analysis: {scenario_name}', fontsize=14, fontweight='bold', pad=20, color='#1e293b')
        plt.xlabel('Feature Values', fontsize=11, labelpad=10, color='#475569')
        plt.ylabel('Density', fontsize=11, labelpad=10, color='#475569')
        
        plt.grid(axis='y', linestyle=':', alpha=0.6, color='#cbd5e1')
        
        status = "DRIFT DETECTED!" if result['is_drifted'] else "No Drift Detected"
        
        info_text = (
            f"D_KL(P || Q) = {result['kl_p_q']:.4f}\n"
            f"D_KL(Q || P) = {result['kl_q_p']:.4f}\n"
            f"Threshold = {result['threshold']:.2f}\n"
            f"Status: {status}"
        )
        
        # Place stats annotation inside the plot
        plt.gca().text(0.04, 0.96, info_text, transform=plt.gca().transAxes, fontsize=10.5,
                       verticalalignment='top', 
                       bbox=dict(boxstyle='round,pad=0.6', facecolor='#ffffff', alpha=0.95, 
                                edgecolor='#e2e8f0'))
        
        plt.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#e2e8f0', fontsize=10)
        
        plt.tight_layout()
        
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        full_path = os.path.join(output_dir, filepath)
        plt.savefig(full_path, dpi=300, facecolor='#ffffff')
        plt.close()
        print(f"[Plot saved]: {full_path}")

# Run simulation scenarios to test the detector
if __name__ == "__main__":
    np.random.seed(42)
    
    # Initialize detector with a drift threshold of 0.1
    detector = DataDriftDetector(threshold=0.1, n_bins=30)
    
    # Generate reference baseline dataset: N(0, 1)
    baseline_data = np.random.normal(loc=0.0, scale=1.0, size=1000)
    
    print("=" * 60)
    print(" Kullback-Leibler (KL) Divergence Data Drift Evaluation ")
    print("=" * 60)
    
    # --- SCENARIO 1: No Drift (Same distribution) ---
    print("\n[Scenario 1]: No Drift Scenario")
    current_no_drift = np.random.normal(loc=0.05, scale=1.0, size=1000) # Minor mean shift
    result_1 = detector.detect_drift(baseline_data, current_no_drift)
    print(f" -> D_KL(P || Q): {result_1['kl_p_q']:.5f}")
    print(f" -> D_KL(Q || P): {result_1['kl_q_p']:.5f} (Difference: {abs(result_1['kl_p_q'] - result_1['kl_q_p']):.5f})")
    print(f" -> Drift detected?: {'Yes 🔴' if result_1['is_drifted'] else 'No 🟢'}")
    detector.plot_and_save(baseline_data, current_no_drift, result_1, "Scenario 1: No Drift", "scenario_1_no_drift.png")
    
    # --- SCENARIO 2: Mean Shift (Drift) ---
    print("\n[Scenario 2]: Mean Shift Scenario")
    current_mean_drift = np.random.normal(loc=0.5, scale=1.0, size=1000) # Shifted mean
    result_2 = detector.detect_drift(baseline_data, current_mean_drift)
    print(f" -> D_KL(P || Q): {result_2['kl_p_q']:.5f}")
    print(f" -> D_KL(Q || P): {result_2['kl_q_p']:.5f}")
    print(f" -> Drift detected?: {'Yes 🔴' if result_2['is_drifted'] else 'No 🟢'}")
    detector.plot_and_save(baseline_data, current_mean_drift, result_2, "Scenario 2: Mean Drift (Drift)", "scenario_2_mean_drift.png")
    
    # --- SCENARIO 3: Variance Shift (Drift) ---
    print("\n[Scenario 3]: Variance Drift Scenario")
    current_var_drift = np.random.normal(loc=0.0, scale=1.6, size=1000) # Expanded std dev
    result_3 = detector.detect_drift(baseline_data, current_var_drift)
    print(f" -> D_KL(P || Q): {result_3['kl_p_q']:.5f}")
    print(f" -> D_KL(Q || P): {result_3['kl_q_p']:.5f}")
    print(f" -> Drift detected?: {'Yes 🔴' if result_3['is_drifted'] else 'No 🟢'}")
    detector.plot_and_save(baseline_data, current_var_drift, result_3, "Scenario 3: Variance Drift (Drift)", "scenario_3_variance_drift.png")
    
    print("\n" + "=" * 60)
    print("Analysis finished. Output charts saved in 'python/output/' directory.")
    print("=" * 60)
