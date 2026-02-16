import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
console.log("BACKEND_URL:", BACKEND_URL);
console.log("API:", API);


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        console.error('Failed to parse user from localStorage');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
  try {
    const response = await axios.post(`${API}/auth/login`, { email, password });

    const { idToken, refreshToken, expiresIn } = response.data;

    // Store token
    localStorage.setItem('token', idToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('expiresIn', expiresIn);

    axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

    const userInfo = { email };
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);

    return userInfo;

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};


  const signup = async (first_name, middle_name, last_name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        first_name,
        middle_name: middle_name || '',
        last_name,
        email,
        password
      });

      return response.data;

    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
