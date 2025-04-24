import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import axios from 'axios';
import Chart from 'chart.js/auto';

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalDevices, setTotalDevices] = useState(0);
  const [activeDevices, setActiveDevices] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState('');
  const [addedDevices, setAddedDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [gasData, setGasData] = useState([]); // Array to store historical data points
  const [gasDataError, setGasDataError] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const trendChartRef = useRef(null);
  const maxDataPoints = 10; // Limit to 10 data points for the trend graph

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) {
      navigate('/sign-in');
      return;
    }

    try {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);

      const loadDevices = () => {
        const savedDevices = localStorage.getItem('addedDevices');
        if (savedDevices) {
          try {
            const parsedDevices = JSON.parse(savedDevices);
            if (Array.isArray(parsedDevices)) {
              if (!parsedUserInfo.isAdmin && parsedUserInfo.deviceId) {
                const userDevice = parsedDevices.find(device => device.id === parsedUserInfo.deviceId);
                setAddedDevices(userDevice ? [userDevice] : []);
                setSelectedDeviceId(userDevice ? userDevice.id : '');
              } else {
                setAddedDevices(parsedDevices);
                setSelectedDeviceId(parsedDevices[0]?.id || '');
              }
            } else {
              console.error('Invalid addedDevices format in localStorage');
              localStorage.removeItem('addedDevices');
            }
          } catch (err) {
            console.error('Error parsing saved devices:', err);
            localStorage.removeItem('addedDevices');
          }
        }
      };

      loadDevices();
    } catch (error) {
      console.error('Error parsing user info:', error);
      localStorage.removeItem('userInfo');
      navigate('/sign-in');
    }

    const handleStorageChange = (e) => {
      if (e.key === 'addedDevices') {
        loadDevices();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  useEffect(() => {
    if (userInfo?.isAdmin) {
      const fetchUsers = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/users');
          setActiveUsers(response.data.length);
        } catch (error) {
          console.error('Error fetching users:', error);
          setActiveUsers(0);
        }
      };
      fetchUsers();
    }
  }, [userInfo]);

  const fetchDevices = async (isInitialFetch = false) => {
    if (!userInfo?.isAdmin) return;

    try {
      if (isInitialFetch) {
        setDevicesLoading(true);
      }
      setDevicesError('');
      const response = await axios.get('http://localhost:5000/api/devices');
      const devices = response.data;
      const newTotalDevices = devices.length;
      const newActiveDevices = devices.filter(device => device.status === 'active').length;

      setTotalDevices(newTotalDevices);
      setActiveDevices(newActiveDevices);
    } catch (error) {
      console.error('Error fetching devices:', error.message);
      setDevicesError('Failed to fetch device data. Please try again later.');
      setTotalDevices(0);
      setActiveDevices(0);
    } finally {
      if (isInitialFetch) {
        setDevicesLoading(false);
      }
    }
  };

  const fetchGasData = async () => {
    if (!selectedDeviceId) return;

    try {
      setGasDataError('');
      const response = await axios.get(`http://localhost:5000/api/data?deviceId=${selectedDeviceId}`);
      const readings = response.data?.body?.Readings || [];

      const gasNameMap = {
        H2: 'H2',
        ALCOHOL: 'Alcohol',
        CH4: 'CH4',
        CO: 'CO',
        C2H5OH: 'C2H5OH',
        DUST_CONCENTRATION: 'DustConcentration',
        HUMIDITY: 'Humidity',
        TEMPERATURE: 'Temperature',
      };

      // Group readings by timestamp and handle invalid timestamps
      const groupedByTimestamp = readings.reduce((acc, reading) => {
        const rawTimestamp = reading.timestamp;
        const timestampDate = new Date(rawTimestamp);
        // Use current time if timestamp is invalid
        const timestamp = isNaN(timestampDate.getTime()) ? new Date().toISOString() : rawTimestamp;
        if (!acc[timestamp]) {
          acc[timestamp] = { timestamp };
        }
        const gasKey = gasNameMap[reading.GasName] || reading.GasName;
        acc[timestamp][gasKey] = isNaN(reading.PPM) || reading.PPM === Infinity ? 0 : reading.PPM;
        return acc;
      }, {});

      const newDataPoint = Object.values(groupedByTimestamp)[0]; // Take the latest timestamp
      if (newDataPoint) {
        setGasData((prevData) => {
          const updatedData = [...prevData, newDataPoint];
          // Keep only the latest maxDataPoints entries, ensuring unique timestamps
          const uniqueData = Array.from(
            new Map(updatedData.map(item => [item.timestamp, item])).values()
          ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          return uniqueData.slice(-maxDataPoints);
        });
      }
    } catch (error) {
      console.error(`Error fetching gas data for device ${selectedDeviceId}:`, error);
      setGasDataError('Failed to fetch gas data. Please try again later.');
    }
  };

  useEffect(() => {
    if (userInfo?.isAdmin || (userInfo && !userInfo.isAdmin && selectedDeviceId)) {
      fetchDevices(true);
      fetchGasData();
      const intervalId = setInterval(() => {
        fetchDevices(false);
        fetchGasData();
      }, 10000);
      return () => clearInterval(intervalId);
    } else {
      setDevicesLoading(false);
    }
  }, [userInfo, selectedDeviceId]);

  // Initialize Trend Chart
  useEffect(() => {
    if (!userInfo || !gasData.length || !trendChartRef.current) return;

    const ctx = trendChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: gasData.map(data => {
          const date = new Date(data.timestamp);
          return isNaN(date.getTime())
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }),
        datasets: [
          {
            label: 'H2',
            data: gasData.map(data => data.H2 || 0),
            borderColor: '#FF4500',
            borderWidth: 2,
            borderDash: [5, 5],
            pointStyle: 'triangle',
            pointRadius: 5,
            pointBackgroundColor: '#FF4500',
            fill: false,
          },
          {
            label: 'Alcohol',
            data: gasData.map(data => data.Alcohol || 0),
            borderColor: '#4682B4',
            borderWidth: 2,
            pointStyle: 'triangle',
            pointRadius: 5,
            pointBackgroundColor: '#4682B4',
            fill: false,
          },
          {
            label: 'CH4',
            data: gasData.map(data => data.CH4 || 0),
            borderColor: '#808080',
            borderWidth: 2,
            borderDash: [2, 2],
            pointStyle: 'cross',
            pointRadius: 5,
            pointBackgroundColor: '#808080',
            fill: false,
          },
          {
            label: 'CO',
            data: gasData.map(data => data.CO || 0),
            borderColor: '#FFD700',
            borderWidth: 2,
            pointStyle: 'rect',
            pointRadius: 5,
            pointBackgroundColor: '#FFD700',
            fill: false,
          },
          {
            label: 'C2H5OH',
            data: gasData.map(data => data.C2H5OH || 0),
            borderColor: '#4169E1',
            borderWidth: 2,
            pointStyle: 'rect',
            pointRadius: 5,
            pointBackgroundColor: '#4169E1',
            fill: false,
          },
          {
            label: 'Dust',
            data: gasData.map(data => data.DustConcentration || 0),
            borderColor: '#2E8B57',
            borderWidth: 2,
            borderDash: [5, 5],
            pointStyle: 'cross',
            pointRadius: 5,
            pointBackgroundColor: '#2E8B57',
            fill: false,
          },
          {
            label: 'Humidity',
            data: gasData.map(data => data.Humidity || 0),
            borderColor: '#4682B4',
            borderWidth: 2,
            pointStyle: 'rect',
            pointRadius: 5,
            pointBackgroundColor: '#4682B4',
            fill: false,
          },
          {
            label: 'Temp',
            data: gasData.map(data => data.Temperature || 0),
            borderColor: '#808080',
            borderWidth: 2,
            borderDash: [2, 2],
            pointStyle: 'cross',
            pointRadius: 5,
            pointBackgroundColor: '#808080',
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Time', color: '#D1D5DB' },
            ticks: { color: '#D1D5DB' },
          },
          y: {
            title: { display: true, text: 'PPM', color: '#D1D5DB' },
            ticks: { color: '#D1D5DB' },
            beginAtZero: true,
            suggestedMax: 160,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#D1D5DB',
              usePointStyle: true,
            },
          },
          title: {
            display: true,
            text: 'Air Quality Trends',
            color: '#D1D5DB',
            font: { size: 16 },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [gasData, userInfo]);

  // Calculate AQI with gas-specific thresholds and weights
  const calculateAQI = (latestData) => {
    if (!latestData) return 0;

    // Define gas-specific thresholds (in PPM) for normalization
    const thresholds = {
      H2: 100, // Hydrogen: Arbitrary threshold
      Alcohol: 50, // Alcohol: Arbitrary threshold
      CH4: 1000, // Methane: High threshold as it's less harmful in small amounts
      CO: 50, // Carbon Monoxide: WHO guideline (50 PPM over 8 hours)
      C2H5OH: 50, // Ethanol: Arbitrary threshold
      DustConcentration: 150, // Dust: PM-like threshold
      Humidity: 100, // Humidity: Percentage (0-100)
      Temperature: 40, // Temperature: Degrees Celsius (arbitrary max for normalization)
    };

    // Define weights for each gas based on health impact
    const weights = {
      H2: 0.1,
      Alcohol: 0.1,
      CH4: 0.05,
      CO: 0.3, // Higher weight due to toxicity
      C2H5OH: 0.1,
      DustConcentration: 0.2,
      Humidity: 0.05,
      Temperature: 0.1,
    };

    const gasValues = Object.entries(latestData)
      .filter(([key]) => key !== 'timestamp')
      .map(([gas, value]) => {
        const threshold = thresholds[gas] || 500; // Default threshold if not specified
        const normalized = Math.min(value / threshold, 1); // Normalize to 0-1
        return normalized * (weights[gas] || 0.125); // Apply weight (default weight 1/8)
      });

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const aqi = Math.round(
      (gasValues.reduce((sum, val) => sum + val, 0) / totalWeight) * 100
    );

    return aqi;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setImageError('Please upload a JPG or PNG image.');
      return;
    }

    setImageLoading(true);
    setImageError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;
      const updatedUserInfo = { ...userInfo, profilePicture: base64Image };
      setUserInfo(updatedUserInfo);
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      setImageLoading(false);
    };
    reader.onerror = () => {
      setImageError('Failed to process the image. Please try again.');
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileImageClick = () => {
    fileInputRef.current.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/sign-in');
  };

  const handleProfileClick = () => {
    if (userInfo?.isAdmin) {
      navigate('/admin-profile');
    } else {
      navigate('/user-profile');
    }
  };

  const isAdmin = userInfo?.isAdmin;

  const getDashboardCards = (() => {
    if (!isAdmin) return [];
    const latestData = gasData[gasData.length - 1];
    const aqi = calculateAQI(latestData);
    return [
      {
        title: 'Total Users',
        value: activeUsers.toString(),
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        color: 'teal',
        trend: '+8%',
      },
      {
        title: 'Total Devices',
        value: totalDevices.toString(),
        icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
        color: 'blue',
        trend: '+12%',
      },
      {
        title: 'Active Devices',
        value: activeDevices.toString(),
        icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
        color: 'green',
        trend: '+2',
      },
      {
        title: 'Air Quality Index',
        value: aqi.toString(),
        icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
        color: 'yellow',
        trend: aqi === 0 ? 'N/A' : aqi < 50 ? 'Good' : 'Moderate',
      },
    ];
  })();

  const generateRoute = (device) => {
    if (device.id && device.position) {
      return `/device/${device.id}/${encodeURIComponent(device.position)}`;
    }
    return '/dashboard';
  };

  const latestData = gasData[gasData.length - 1];
  const aqi = calculateAQI(latestData);

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
        isSidebarCollapsed={isSidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        userInfo={userInfo}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <div>
              <h1 className="text-lg font-semibold text-white">Dashboard</h1>
              <p className="text-sm text-gray-400">Indoor Air Quality Monitoring</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-gray-300 text-sm bg-gray-700 px-3 py-1 rounded-md">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            <div className="relative">
              <button className="flex items-center text-gray-400 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute top-0 right-0 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </button>
            </div>

            <div className="relative group">
              <div className="flex items-center cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="relative" onClick={handleProfileImageClick}>
                  {imageLoading ? (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-600">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : (
                    <img
                      className="h-8 w-8 rounded-full mr-2 cursor-pointer"
                      src={userInfo?.profilePicture || '/api/placeholder/32/32'}
                      alt="User profile"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-gray-300 text-sm font-medium">
                  {userInfo?.username || 'User'}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {imageError && (
                <div className="absolute right-0 mt-2 w-48 bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-2 rounded-lg shadow-lg z-10">
                  {imageError}
                </div>
              )}

              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-700 z-10 hidden group-hover:block">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm font-medium text-white">{userInfo?.username || 'User'}</p>
                  <p className="text-xs text-gray-400">{userInfo?.email || ''}</p>
                  {userInfo?.isAdmin && (
                    <span className="inline-block bg-purple-500 text-white text-xs px-2 py-0.5 rounded mt-1">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleProfileClick}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {userInfo?.isAdmin ? 'Admin Profile' : 'Profile'}
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-900 p-4">
          {devicesError && isAdmin && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {devicesError}
            </div>
          )}

          {isAdmin || (!isAdmin && selectedDeviceId) ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {devicesLoading ? (
                  Array(4)
                    .fill()
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-6 bg-gray-700 rounded w-12"></div>
                          </div>
                          <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
                        </div>
                        <div className="mt-2 h-4 bg-gray-700 rounded w-20"></div>
                      </div>
                    ))
                ) : (
                  getDashboardCards.map((card, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">{card.title}</p>
                          <p className={`text-2xl font-bold text-${card.color}-400`}>{card.value}</p>
                        </div>
                        <div
                          className={`w-10 h-10 bg-${card.color}-500 bg-opacity-20 rounded-lg flex items-center justify-center`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-6 w-6 text-${card.color}-400`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={card.icon}
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center">
                        <span
                          className={`text-${card.color === 'yellow' ? 'yellow' : 'green'}-400 text-sm flex items-center`}
                        >
                          {card.trend}
                        </span>
                        <span className="text-gray-400 text-sm ml-2">
                          {card.color === 'yellow' ? '| Acceptable' : 'from last week'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">Overall Air Quality Trends</h2>
                    <div>
                      <label htmlFor="device-selector" className="text-white text-sm mr-2">Select Device:</label>
                      <select
                        id="device-selector"
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {addedDevices.length === 0 ? (
                          <option value="">No devices available</option>
                        ) : (
                          addedDevices.map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.position} (ID: {device.id})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  {gasDataError && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {gasDataError}
                    </div>
                  )}
                  <div className="bg-gray-700 h-64 rounded-lg">
                    {selectedDeviceId ? (
                      <canvas ref={trendChartRef} className="w-full h-full"></canvas>
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-400">
                        <span>Please select a device to view trends</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg">
                  <h2 className="text-lg font-semibold text-white mb-4 text-center">Overall Air Quality Index</h2>
                  <div className="bg-gray-700 h-64 rounded-lg flex flex-col items-center justify-center">
                    {selectedDeviceId ? (
                      <>
                        <p className="text-gray-400 text-sm mb-2">Air Quality Index</p>
                        <div className="flex items-center">
                          <div
                            className={`w-4 h-4 mr-2 rounded-full ${
                              aqi < 50 ? 'bg-green-500' : aqi < 100 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          ></div>
                          <span className="text-white text-4xl font-bold">{aqi}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-400">
                        <span>Please select a device to view AQI</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="mb-6">
            <h2 className="text-white text-xl mb-4">Device Positions</h2>
            {addedDevices.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg text-center">
                <p className="text-gray-400">
                  {isAdmin
                    ? 'No device positions added. Add devices in the Devices section.'
                    : 'No device assigned. Contact your administrator.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {addedDevices.map((device, index) => (
                  <Link to={generateRoute(device)} key={device.id || index} className="block">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg hover:bg-gray-750 transition-colors h-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-300 font-medium">Device Position</p>
                          <p className="text-blue-400 text-lg font-bold">{device.position}</p>
                          <p className="text-gray-400 text-sm">ID: {device.id}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 