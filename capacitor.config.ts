import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.rajufamily.dashboard',
  appName: 'Raju Family',
  webDir: 'out',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
}

export default config
