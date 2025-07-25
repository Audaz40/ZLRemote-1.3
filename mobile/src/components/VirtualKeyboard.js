import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Vibration,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const KEYBOARD_LAYOUTS = {
  qwerty: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['numbers', 'space', 'enter']
  ],
  numbers: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['symbols', '.', ',', '?', '!', "'", 'backspace'],
    ['letters', 'space', 'enter']
  ],
  symbols: [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
    ['numbers', '.', ',', '?', '!', "'", 'backspace'],
    ['letters', 'space', 'enter']
  ]
};

const VirtualKeyboard = ({ visible, onKeyPress, onClose, style }) => {
  const [layout, setLayout] = useState('qwerty');
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const slideAnim = useState(new Animated.Value(300))[0];

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleKeyPress = useCallback((key) => {
    Vibration.vibrate(10);
    
    let processedKey = key;
    
    switch (key) {
      case 'shift':
        setShift(!shift);
        return;
      case 'capslock':
        setCapsLock(!capsLock);
        setShift(false);
        return;
      case 'numbers':
        setLayout('numbers');
        return;
      case 'letters':
        setLayout('qwerty');
        return;
      case 'symbols':
        setLayout('symbols');
        return;
      case 'space':
        processedKey = ' ';
        break;
      case 'enter':
        processedKey = '\n';
        break;
      case 'backspace':
        processedKey = 'Backspace';
        break;
      default:
        if (layout === 'qwerty') {
          if (shift || capsLock) {
            processedKey = key.toUpperCase();
          }
          if (shift && !capsLock) {
            setShift(false);
          }
        }
        break;
    }
    
    onKeyPress?.(processedKey);
  }, [shift, capsLock, layout, onKeyPress]);

  const renderKey = (key, index) => {
    let keyText = key;
    let keyStyle = styles.key;
    let textStyle = styles.keyText;
    
    switch (key) {
      case 'shift':
        keyText = shift ? '⇧' : '⇧';
        keyStyle = [styles.key, styles.specialKey, shift && styles.activeKey];
        break;
      case 'backspace':
        keyText = '⌫';
        keyStyle = [styles.key, styles.specialKey];
        break;
      case 'enter':
        keyText = '↵';
        keyStyle = [styles.key, styles.enterKey];
        textStyle = [styles.keyText, styles.enterText];
        break;
      case 'space':
        keyText = '';
        keyStyle = [styles.key, styles.spaceKey];
        break;
      case 'numbers':
      case 'letters':
      case 'symbols':
        keyText = key === 'numbers' ? '123' : key === 'letters' ? 'ABC' : '#+=';
        keyStyle = [styles.key, styles.layoutKey];
        textStyle = [styles.keyText, styles.layoutText];
        break;
      default:
        if (layout === 'qwerty' && (shift || capsLock)) {
          keyText = key.toUpperCase();
        }
        break;
    }
    
    return (
      <TouchableOpacity
        key={`${key}-${index}`}
        style={keyStyle}
        onPress={() => handleKeyPress(key)}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>{keyText}</Text>
      </TouchableOpacity>
    );
  };

  const renderRow = (row, rowIndex) => {
    return (
      <View key={rowIndex} style={styles.row}>
        {row.map((key, index) => renderKey(key, index))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.keyboard,
            style,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Virtual Keyboard</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.keysContainer}>
            {KEYBOARD_LAYOUTS[layout].map((row, index) => renderRow(row, index))}
          </View>
          
          <View style={styles.indicators}>
            <View style={[styles.indicator, shift && styles.activeIndicator]}>
              <Text style={styles.indicatorText}>Shift</Text>
            </View>
            <View style={[styles.indicator, capsLock && styles.activeIndicator]}>
              <Text style={styles.indicatorText}>Caps</Text>
            </View>
            <View style={styles.indicator}>
              <Text style={styles.indicatorText}>{layout.toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboard: {
    backgroundColor: '#2c2c2c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  keysContainer: {
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    backgroundColor: '#404040',
    borderRadius: 8,
    marginHorizontal: 2,
    height: 45,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  keyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  specialKey: {
    backgroundColor: '#555',
    minWidth: 45,
  },
  activeKey: {
    backgroundColor: '#667eea',
  },
  enterKey: {
    backgroundColor: '#667eea',
    minWidth: 80,
  },
  enterText: {
    fontSize: 18,
  },
  spaceKey: {
    backgroundColor: '#404040',
    minWidth: SCREEN_WIDTH * 0.4,
  },
  layoutKey: {
    backgroundColor: '#555',
    minWidth: 50,
  },
  layoutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  indicator: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: '#667eea',
  },
  indicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default VirtualKeyboard;