import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

const handleLogin = async (data) => {
  try {
    const response = await axios.post('http://localhost:5000/api/login', {
      email: data.email,
      password: data.password
    });

    // Make sure response has the expected structure
    if (!response.data || !response.data.token || !response.data.user) {
      throw new Error('Invalid server response');
    }

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('userRole', response.data.user.role);
    localStorage.setItem('userEmail', response.data.user.email);
    
    // Check if full_name exists before setting it
    if (response.data.user.full_name) {
      localStorage.setItem('userName', response.data.user.full_name);
    }
    
    onLogin(response.data.token, response.data.user.role, {
      email: response.data.user.email,
      full_name: response.data.user.full_name || ''
    });
    
    // Redirect based on role
    if (response.data.user.role === 'admin' || response.data.user.role === 'deo') {
      navigate('/dashboard');
    } else {
      navigate('/user-page');
    }
  } catch (err) {
    console.error('Login failed:', err);
    const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Login failed. Please try again.';
    alert(errorMessage);
  }
};

  return <AuthForm type="login" onSubmit={handleLogin} />;
};

export default Login;