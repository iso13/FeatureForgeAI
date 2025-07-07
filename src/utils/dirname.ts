/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { fileURLToPath } from 'url';
import path from 'path';

export function getDirName(metaUrl: string) {
  return path.dirname(fileURLToPath(metaUrl));
}