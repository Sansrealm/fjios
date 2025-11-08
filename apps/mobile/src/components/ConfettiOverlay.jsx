import React, { useEffect, useState } from 'react';
import { View, Dimensions } from 'react-native';
import { MotiView } from 'moti';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ConfettiParticle = ({ delay = 0, startY = -20 }) => {
  const colors = ['#8FAEA2', '#A8C6B8', '#7A9D8F', '#6B8E7F', '#5A7D70'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const startX = Math.random() * screenWidth;
  const endX = startX + (Math.random() - 0.5) * 100; // Slight horizontal drift
  const size = Math.random() * 8 + 4; // 4-12px size
  const rotationEnd = Math.random() * 720 + 360; // 1-2 full rotations

  return (
    <MotiView
      from={{
        translateY: startY,
        translateX: startX,
        opacity: 1,
        scale: 1,
        rotate: '0deg',
      }}
      animate={{
        translateY: screenHeight + 50,
        translateX: endX,
        opacity: 0,
        scale: 0.3,
        rotate: `${rotationEnd}deg`,
      }}
      transition={{
        type: 'timing',
        duration: 3000,
        delay,
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size / 2,
      }}
    />
  );
};

export default function ConfettiOverlay({ visible, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (visible) {
      // Generate particles
      const newParticles = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          delay: Math.random() * 500, // Stagger the start times
        });
      }
      setParticles(newParticles);

      // Auto-complete after animation duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
        />
      ))}
    </View>
  );
}