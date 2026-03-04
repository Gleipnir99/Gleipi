import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gleipi.app',
  appName: 'gleipi',
  webDir: 'dist',
  // iOS 전용 설정
  ios: {
    contentInset: 'always',   // safe area 자동 적용
    backgroundColor: '#000000',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#4F8EF7',
      sound: 'default',
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config
