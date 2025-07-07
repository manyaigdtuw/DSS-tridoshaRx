import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';

const Signup = ({ onSignup }) => {
  const navigate = useNavigate();

  const handleSignup = async (data) => {
    try {
      const response = await axios.post('http://localhost:5000/api/register', data);
      
      alert('Registration successful! Please login with your credentials.');
      navigate('/login');
      
      if (onSignup) onSignup();
    } catch (err) {
      console.error('Signup failed:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return <AuthForm type="signup" onSubmit={handleSignup} />;
};

export default Signup;