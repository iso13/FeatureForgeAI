#!/bin/bash

HEADER='FeatureForge AI'
LICENSE_TEXT='// SPDX-License-Identifier: BSL-1.1'

find src -type f -name "*.ts" ! -name "*.d.ts" | while read file; do
  if ! grep -q "$HEADER" "$file"; then
    echo "🔧 Adding header to: $file"
    {
      echo '/**'
      echo ' * FeatureForge AI'
      echo ' * Copyright (c) 2024–2025 David Tran'
      echo ' * Licensed under the Business Source License 1.1'
      echo ' * See LICENSE.txt for full terms'
      echo ' * Change Date: January 1, 2029 (license converts to MIT)'
      echo ' * Contact: davidtran@featuregen.ai'
      echo ' */'
      echo ''
      echo "$LICENSE_TEXT"
      echo ''
      cat "$file"
    } > "$file.new" && mv "$file.new" "$file"
  else
    echo "✅ Already has header: $file"
  fi
done