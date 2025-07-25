import React, { useRef, useCallback } from 'react';
import { PanGestureHandler, TapGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { Animated, View } from 'react-native';

const TouchHandler = ({ children, onTouch, onGesture, style }) => {
  const panRef = useRef();
  const tapRef = useRef();
  const pinchRef = useRef();
  
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const handleTap = useCallback((event) => {
    const { x, y } = event.nativeEvent;
    onTouch?.({
      type: 'tap',
      x,
      y,
      timestamp: Date.now()
    });
  }, [onTouch]);

  const handlePan = useCallback((event) => {
    const { x, y, state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      onTouch?.({
        type: 'panStart',
        x,
        y,
        timestamp: Date.now()
      });
    } else if (state === State.ACTIVE) {
      translateX.setValue(translationX);
      translateY.setValue(translationY);
      
      onTouch?.({
        type: 'panMove',
        x,
        y,
        translationX,
        translationY,
        timestamp: Date.now()
      });
    } else if (state === State.END || state === State.CANCELLED) {
      onTouch?.({
        type: 'panEnd',
        x,
        y,
        velocityX,
        velocityY,
        timestamp: Date.now()
      });
      
      // Reset translation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [onTouch, translateX, translateY]);

  const handlePinch = useCallback((event) => {
    const { scale: gestureScale, state, focalX, focalY } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      scale.setValue(gestureScale);
      
      onGesture?.({
        type: 'pinch',
        scale: gestureScale,
        focalX,
        focalY,
        timestamp: Date.now()
      });
    } else if (state === State.END || state === State.CANCELLED) {
      onGesture?.({
        type: 'pinchEnd',
        scale: gestureScale,
        timestamp: Date.now()
      });
      
      // Reset scale
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [onGesture, scale]);

  return (
    <PinchGestureHandler ref={pinchRef} onGestureEvent={handlePinch}>
      <Animated.View style={[style, { flex: 1 }]}>
        <PanGestureHandler 
          ref={panRef} 
          onGestureEvent={handlePan}
          simultaneousHandlers={pinchRef}
        >
          <Animated.View style={{ flex: 1 }}>
            <TapGestureHandler 
              ref={tapRef} 
              onHandlerStateChange={handleTap}
              simultaneousHandlers={[panRef, pinchRef]}
            >
              <Animated.View 
                style={[
                  { flex: 1 },
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      { scale }
                    ]
                  }
                ]}
              >
                {children}
              </Animated.View>
            </TapGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </PinchGestureHandler>
  );
};

export default TouchHandler;