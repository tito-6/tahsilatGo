import React, { useState, useEffect } from 'react';

interface LoginProps {
  onLogin: (credentials: { username: string; password: string }) => void;
  isLoading: boolean;
  error: string | null;
}

interface MachineInfo {
  ip: string;
  userAgent: string;
  platform: string;
  timestamp: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [showMachineInfo, setShowMachineInfo] = useState(false);

  // Get machine information and refresh it periodically (every 10s)
  useEffect(() => {
    let mounted = true;

    const getMachineInfo = async () => {
      try {
        // Get IP address from external service
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();

        const info: MachineInfo = {
          ip: ipData.ip || 'Bilinmiyor',
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toLocaleString('tr-TR')
        };

        if (mounted) setMachineInfo(info);
      } catch (error) {
        console.error('Machine info fetch error:', error);
        if (mounted) setMachineInfo({
          ip: 'Alınamadı',
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toLocaleString('tr-TR')
        });
      }
    };

    // Initial fetch
    getMachineInfo();

    // Poll every 10 seconds so IP and timestamp update while the login page is shown
    const interval = setInterval(() => {
      getMachineInfo();
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowMachineInfo(true);
    onLogin({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* Animated Background Image Layer */}
      <div 
        className="absolute inset-0 bg-animated"
        style={{
          backgroundImage: 'url(/bg1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          animation: 'backgroundSlowZoom 20s ease-in-out infinite alternate'
        }}
      />
      
      {/* Static Animated Dark Overlay */}
      <div className="absolute inset-0 bg-black" style={{
        animation: 'overlayPulse 15s ease-in-out infinite alternate'
      }}></div>

      {/* Static Login Card Container */}
      <div className="relative w-full max-w-md mx-auto px-6 z-10">
        {/* Static Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
             style={{
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
             }}>
          
          {/* Header Section */}
          <div className="px-8 py-12 text-center"
               style={{
                 background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
               }}>
            
            {/* Logo/Icon */}
            <div className="mx-auto w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-white shadow-lg transform transition-transform duration-300 hover:scale-110">
              <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Tahsilat Raporu Sistemi
            </h1>
            <p className="text-gray-200 text-lg">
              Güvenli Giriş Paneli
            </p>
          </div>

          {/* Form Section */}
          <div className="px-8 py-8">
            
            {/* Machine Information - Always Visible */}
            {machineInfo && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">Makine Bilgileri</h3>
                </div>
                <div className="space-y-2 text-xs text-blue-700">
                  <div className="flex justify-between">
                    <span className="font-medium">IP Adresi:</span>
                    <span className="font-mono">{machineInfo.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Platform:</span>
                    <span className="font-mono">{machineInfo.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sistem Zamanı:</span>
                    <span className="font-mono">{machineInfo.timestamp}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <span className="font-medium">Tarayıcı:</span>
                    <div className="text-xs text-blue-600 break-all">
                      {machineInfo.userAgent.split(' ').slice(0, 3).join(' ')}...
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    placeholder="Kullanıcı adınızı girin"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Şifre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="Şifrenizi girin"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Machine Details Display - Only during login process */}
              {showMachineInfo && machineInfo && isLoading && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Giriş İşlemi Başlatıldı</h3>
                  </div>
                  <div className="space-y-2 text-xs text-green-700">
                    <div className="flex justify-between">
                      <span className="font-medium">Giriş Denemesi:</span>
                      <span className="font-mono">{machineInfo.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">IP Adresi:</span>
                      <span className="font-mono">{machineInfo.ip}</span>
                    </div>
                    <div className="text-center mt-2 pt-2 border-t border-green-200">
                      <span className="text-green-600 font-medium">Kimlik doğrulanıyor...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg animate-pulse">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-medium">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-xl text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transform"
                style={{
                  background: isLoading || (!username.trim() || !password.trim()) 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : isHovered 
                      ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
                      : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                  boxShadow: isHovered && !isLoading && username.trim() && password.trim()
                    ? '0 10px 25px -5px rgba(75, 85, 99, 0.4), 0 10px 10px -5px rgba(75, 85, 99, 0.04)'
                    : '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
                  transform: isHovered && !isLoading && username.trim() && password.trim() ? 'translateY(-1px)' : 'translateY(0)'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Giriş yapılıyor...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Güvenli Giriş
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Footer Section */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">Yetkili Personel Girişi</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Bu sistem yetkili personel tarafından kullanılmak üzere tasarlanmıştır.<br />
                Giriş bilgilerinizi sistem yöneticisinden temin ediniz.
              </p>
              <div className="flex items-center justify-center space-x-4 pt-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Sistem Aktif</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs text-gray-500">Güvenli Bağlantı</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Static Copyright */}
        <div className="mt-8 text-center">
          <p className="text-white text-sm drop-shadow-lg">
            © 2024 Tahsilat Raporu Sistemi - Ahmet Elhalit - Tüm hakları saklıdır
          </p>
          <p className="text-gray-200 text-xs mt-2">
            <a 
              href="https://github.com/tito-6" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200 underline drop-shadow-lg"
            >
              GitHub: @tito-6
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};