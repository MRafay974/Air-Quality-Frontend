import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaMicrochip } from 'react-icons/fa';
import { MdErrorOutline } from 'react-icons/md';

const Devices = () => {
  const [devices, setDevices] = useState([]); // All devices from API
  const [addedDevices, setAddedDevices] = useState(() => {
    const savedDevices = localStorage.getItem('addedDevices');
    return savedDevices ? JSON.parse(savedDevices) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [newDevicePosition, setNewDevicePosition] = useState('');
  const [deviceStatuses, setDeviceStatuses] = useState({}); // Track last data timestamp and activity

  // Load devices from API on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/devices');
        setDevices(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching devices. Please try again later.');
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // Save addedDevices to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('addedDevices', JSON.stringify(addedDevices));
  }, [addedDevices]);

  // Check device activity by querying data endpoint
  useEffect(() => {
    const checkDeviceActivity = async () => {
      const newStatuses = {};
      for (const device of addedDevices) {
        try {
          const response = await axios.get(`http://localhost:5000/api/data?deviceId=${device.id}`);
          const data = response.data;
  
          console.log(`Response for device ${device.id}:`, JSON.stringify(data, null, 2));
  
          if (!data || !data.body || !data.body.Readings || data.body.Readings.length === 0) {
            newStatuses[device.id] = {
              isActive: false,
              lastUpdated: 'No data',
            };
            continue;
          }
  
          let mostRecentTimestamp = null;
          data.body.Readings.forEach(reading => {
            let readingTime = null;
            if (reading.timestamp) {
              // Handle ISO strings, Unix seconds, or milliseconds
              if (typeof reading.timestamp === 'string' && reading.timestamp.match(/^\d{4}-\d{2}-\d{2}T/)) {
                readingTime = new Date(reading.timestamp);
              } else if (typeof reading.timestamp === 'number') {
                // Assume seconds if < 1 billion, else milliseconds
                readingTime = new Date(reading.timestamp < 1e9 ? reading.timestamp * 1000 : reading.timestamp);
              } else if (typeof reading.timestamp === 'string' && !isNaN(Number(reading.timestamp))) {
                readingTime = new Date(Number(reading.timestamp) < 1e9 ? Number(reading.timestamp) * 1000 : Number(reading.timestamp));
              }
            }
  
            if (readingTime && !isNaN(readingTime.getTime())) {
              if (!mostRecentTimestamp || readingTime > mostRecentTimestamp) {
                mostRecentTimestamp = readingTime;
              }
            }
          });
  
          if (!mostRecentTimestamp) {
            newStatuses[device.id] = {
              isActive: false,
              lastUpdated: 'Invalid timestamp',
            };
            continue;
          }
  
          const now = new Date();
          const timeDifference = now - mostRecentTimestamp;
          // Align with backend's 30-second window
          const isActive = timeDifference <= 30000;
  
          newStatuses[device.id] = {
            isActive,
            lastUpdated: mostRecentTimestamp.toLocaleString(),
          };
        } catch (err) {
          console.error(`Error checking status for device ${device.id}:`, err.message);
          newStatuses[device.id] = {
            isActive: false,
            lastUpdated: 'Error checking status',
          };
        }
      }
      setDeviceStatuses(newStatuses);
    };
  
    checkDeviceActivity();
    const interval = setInterval(checkDeviceActivity, 10000);
    return () => clearInterval(interval);
  }, [addedDevices]);
  // Handle adding a new device
  const handleAddDevice = (e) => {
    e.preventDefault();
    if (!selectedDeviceId) {
      setError('Please select a device ID.');
      return;
    }
    if (!newDevicePosition.trim()) {
      setError('Please enter a device position.');
      return;
    }

    const sanitizedPosition = newDevicePosition.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    if (!sanitizedPosition) {
      setError('Invalid device position. Use alphanumeric characters, spaces, or hyphens.');
      return;
    }

    if (addedDevices.some((device) => device.id === selectedDeviceId)) {
      setError('This device ID has already been added.');
      return;
    }

    const newDevice = {
      id: selectedDeviceId,
      position: sanitizedPosition,
    };

    setAddedDevices((prevDevices) => [...prevDevices, newDevice]);
    setSelectedDeviceId('');
    setNewDevicePosition('');
    setError(null);
  };

  // Handle removing a device
  const handleRemoveDevice = (id) => {
    const updatedDevices = addedDevices.filter(device => device.id !== id);
    setAddedDevices(updatedDevices);
    setDeviceStatuses((prev) => {
      const newStatuses = { ...prev };
      delete newStatuses[id];
      return newStatuses;
    });
  };

  // Check if a device is active
  const isDeviceActive = (deviceId) => {
    return deviceStatuses[deviceId]?.isActive || false;
  };

  // Handle device selection change
  const handleDeviceSelection = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h2 className="text-3xl font-bold text-white mb-6">Device List</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array(4).fill().map((_, index) => (
            <div
              key={index}
              className="bg-gray-800 p-6 rounded-xl shadow-lg animate-pulse border border-gray-700"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
                <div className="ml-4 flex-1">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <h2 className="text-3xl font-bold text-white mb-6">Device List</h2>
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-300 px-6 py-4 rounded-xl flex items-center max-w-lg mx-auto">
          <MdErrorOutline className="h-6 w-6 mr-3 text-red-400" />
          <span className="text-lg">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold text-white mb-6">Device List</h2>

      <div className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <form onSubmit={handleAddDevice} className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedDeviceId}
            onChange={handleDeviceSelection}
            className="flex-1 p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Device ID</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newDevicePosition}
            onChange={(e) => setNewDevicePosition(e.target.value)}
            placeholder="Enter device position (e.g., Living Room)"
            className="flex-1 p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            Add Device
          </button>
        </form>
      </div>

      {addedDevices.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
          <p className="text-gray-400 text-lg">No devices added. Use the form above to add a device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {addedDevices.map((device) => (
            <div
              key={device.id}
              className={`relative p-6 rounded-xl shadow-lg transform transition-all duration-300 border-2 ${
                isDeviceActive(device.id) ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <FaMicrochip
                  className={`h-12 w-12 ${
                    isDeviceActive(device.id) ? 'text-green-400' : 'text-red-400'
                  }`}
                />
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      isDeviceActive(device.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {isDeviceActive(device.id) ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={() => handleRemoveDevice(device.id)}
                    className="text-red-400 hover:text-red-500"
                    title="Remove Device"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Device ID: {device.id}
                </h3>
                <p className="text-sm text-gray-300 mb-2">
                  Position: {device.position}
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      isDeviceActive(device.id) ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></span>
                  {isDeviceActive(device.id) ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-gray-400">
                  Last Updated: {deviceStatuses[device.id]?.lastUpdated || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Devices;