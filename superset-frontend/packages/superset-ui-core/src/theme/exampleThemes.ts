/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint-disable theme-colors/no-literal-colors */
import { type SerializableThemeConfig, ThemeAlgorithm } from './types';

const exampleThemes: Record<string, SerializableThemeConfig> = {
  superset: {
    token: {
      colorBgElevated: '#fafafa',
    },
  },
  professionalPurple: {
    token: {
      // Primary purple theme
      colorPrimary: '#8B5CF6',
      colorLink: '#8B5CF6',
      
      // White + Gray backgrounds
      colorBgBase: '#FFFFFF',
      colorBgContainer: '#F8FAFC',
      colorBgElevated: '#FFFFFF',
      colorBgLayout: '#FFFFFF',
      colorBgSpotlight: '#F3F4F6',
      
      // Gray borders with purple accents
      colorBorder: '#E5E7EB',
      colorBorderSecondary: '#F3F4F6',
      colorPrimaryBorder: '#8B5CF6',
      colorPrimaryBorderHover: '#7C3AED',
      colorSplit: '#E5E7EB',
      
      // Professional text colors
      colorText: '#111827',
      colorTextSecondary: '#6B7280',
      colorTextTertiary: '#9CA3AF',
      colorTextLabel: '#374151',
      colorTextDescription: '#6B7280',
      colorTextPlaceholder: '#9CA3AF',
      colorTextHeading: '#111827',
      
      // Clean fills
      colorFill: '#F9FAFB',
      colorFillSecondary: '#F3F4F6',
      colorFillContent: '#F8FAFC',
      colorFillAlter: '#F9FAFB',
      colorControlItemBgHover: '#F3F4F6',
      colorControlItemBgActive: '#EDE9FE',
      colorBgTextHover: '#F9FAFB',
      
      // Hover states
      colorPrimaryHover: '#7C3AED',
      colorPrimaryActive: '#6D28D9',
      
      // Modern status colors
      colorError: '#EF4444',
      colorWarning: '#F59E0B',
      colorSuccess: '#10B981',
      colorInfo: '#3B82F6',
      
      // Design tokens
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
    },
    algorithm: ThemeAlgorithm.DEFAULT,
  },
  supersetDark: {
    token: {},
    algorithm: ThemeAlgorithm.DARK,
  },
  supersetCompact: {
    token: {},
    algorithm: ThemeAlgorithm.COMPACT,
  },
  funky: {
    token: {
      colorPrimary: '#f759ab', // hot pink
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#40a9ff',
      borderRadius: 12,
      fontFamily: 'Comic Sans MS, cursive',
    },
    algorithm: ThemeAlgorithm.DEFAULT,
  },
  funkyDark: {
    token: {
      colorPrimary: '#f759ab', // hot pink
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#40a9ff',
      borderRadius: 12,
      fontFamily: 'Comic Sans MS, cursive',
    },
    algorithm: ThemeAlgorithm.DARK,
  },
};
export default exampleThemes;
