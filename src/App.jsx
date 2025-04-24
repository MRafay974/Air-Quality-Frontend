import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Devices from './Devices';
import DeviceDetail from './DeviceDetails';
import SignIn from './SignIn';
import HomePage from './HomePage';
import UserManagement from './UserManagement';
import Signup from './Signup';
import Profile from './Profile';
import axios from 'axios';

// Protected route for DeviceDetail
const ProtectedDeviceRoute = ({ children }) => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const validateDeviceId = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/devices');
        const validDeviceIds = response.data.map(device => device.id);
        if (!validDeviceIds.includes(deviceId)) {
          setIsValid(false);
          navigate('/dashboard', { replace: true });
        } else {
          setIsValid(true);
        }
      } catch (err) {
        console.error('Error validating device ID:', err);
        setIsValid(false);
        navigate('/dashboard', { replace: true });
      }
    };

    validateDeviceId();
  }, [deviceId, navigate]);

  if (isValid === null) {
    return (
      <div className="flex h-screen bg-gray-900 text-gray-100">
        <div className="flex-1 p-4">
          <p className="text-center text-gray-400">Validating device...</p>
        </div>
      </div>
    );
  }

  return isValid ? children : null;
};

function App() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/users" element={<UserManagement />} />
        <Route
          path="/device/:deviceId/:deviceName"
          element={
            <ProtectedDeviceRoute>
              <DeviceDetail />
            </ProtectedDeviceRoute>
          }
        />
        <Route path="/profile" element={<Profile userInfo={userInfo} />} />
        <Route path="/admin-profile" element={<Profile userInfo={userInfo} isAdminView={true} />} />
        <Route path="/user-profile" element={<Profile userInfo={userInfo} isAdminView={false} />} />
      </Routes>
    </Router>
  );
}

export default App;