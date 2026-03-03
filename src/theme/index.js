export const palette = {
  green:       '#4CAF50',
  greenLight:  '#81C784',
  greenDark:   '#388E3C',
  orange:      '#FF7043',
  orangeLight: '#FFAB91',
  yellow:      '#FFC107',
  red:         '#EF5350',
  white:       '#FFFFFF',
  black:       '#000000',
  dark900: '#0D0D1A',
  dark800: '#1A1A2E',
  dark700: '#16213E',
  dark600: '#0F3460',
  dark500: '#1E1E2E',
  dark400: '#2A2A3E',
  dark300: '#3A3A4E',
  light100: '#F8F9FA',
  light200: '#E9ECEF',
  light300: '#DEE2E6',
  light400: '#CED4DA',
  light500: '#ADB5BD',
};

export const lightColors = {
  background:    palette.light100,
  surface:       palette.white,
  surfaceSecond: palette.light200,
  primary:       palette.green,
  primaryLight:  palette.greenLight,
  primaryDark:   palette.greenDark,
  accent:        palette.orange,
  text:          '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  border:        palette.light300,
  error:         palette.red,
  warning:       palette.yellow,
  success:       palette.green,
  tabBar:        palette.white,
  tabBarBorder:  palette.light300,
  card:          palette.white,
  shadow:        'rgba(0,0,0,0.08)',
};

export const darkColors = {
  background:    palette.dark800,
  surface:       palette.dark500,
  surfaceSecond: palette.dark400,
  primary:       palette.green,
  primaryLight:  palette.greenLight,
  primaryDark:   palette.greenDark,
  accent:        palette.orange,
  text:          '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
  border:        palette.dark300,
  error:         palette.red,
  warning:       palette.yellow,
  success:       palette.green,
  tabBar:        palette.dark500,
  tabBarBorder:  palette.dark300,
  card:          palette.dark400,
  shadow:        'rgba(0,0,0,0.3)',
};

export const typography = {
  h1:      { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  h2:      { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  h3:      { fontSize: 20, fontWeight: '600' },
  h4:      { fontSize: 17, fontWeight: '600' },
  body:    { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyS:   { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  caption: { fontSize: 11, fontWeight: '400' },
  label:   { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};