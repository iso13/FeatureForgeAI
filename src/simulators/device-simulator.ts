/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

export class HeartRateSimulator {
    private heartRate: number = 75;
    private alert: string | null = null;
  
    simulate(bpm: number): { alert: string | null; status: string } {
      this.heartRate = bpm;
      if (bpm > 120) {
        this.alert = 'ALERT_HIGH_HEART_RATE';
        return { alert: this.alert, status: 'ALERT' };
      } else {
        this.alert = null;
        return { alert: null, status: 'NORMAL' };
      }
    }
  
    getLastAlert(): string | null {
      return this.alert;
    }
  }