import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { TapGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { GalleryItemType } from './types';
import { useAnimatedGestureHandler } from './useAnimatedGestureHandler';
import { useSharedValue, workletNoop } from './utils';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
});

export interface Measurements {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface LightboxItemPayloadType extends Measurements {
  index: number;
}

export interface LightBoxItemProps {
  children: JSX.Element;
  index: number;
  onPress: (payload: LightboxItemPayloadType) => void;
}

export function LightBoxItem({
  children,
  onPress,
  index,
}: LightBoxItemProps) {
  const ref = useAnimatedRef<Animated.View>();

  // const width = useSharedValue(0);
  // const height = useSharedValue(0);
  // const x = useSharedValue(0);
  // const y = useSharedValue(0);
  // const opacity = useSharedValue(1);

  function handlePress(measurements: Measurements) {
    onPress({
      ...measurements,
      index,
    });
  }

  const handler = useAnimatedGestureHandler({
    onFinish: (evt, ctx, isCanceledOrFailed) => {
      if (isCanceledOrFailed) {
        return;
      }

      // measure the image
      // width/height and position to animate from it to the full screen one
      const measurements = measure(ref);

      const { width, height, pageX: x, pageY: y } = measurements;

      handlePress({
        width,
        height,
        x,
        y,
      });
    },
  });

  const opacityStyles = useAnimatedStyle(() => {
    return {
      // opacity: opacity.value,
    };
  });

  return (
    <TapGestureHandler onGestureEvent={handler}>
      <Animated.View ref={ref} style={opacityStyles}>
        {children}
      </Animated.View>
    </TapGestureHandler>
  );
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const timingConfig = {
  duration: 240,
  easing: Easing.bezier(0.33, 0.01, 0, 1),
};

interface LightboxTransitionProps {
  item: GalleryItemType;
  measurements: Measurements;
  dimensions?: {
    width: number;
    height: number;
  };
  children: JSX.Element;
  BackdropComponent?: React.ElementType;
  OverlayComponent?: React.ElementType;
  onReady?: () => void;
}

export function LightboxTransition({
  item,
  measurements,
  dimensions = Dimensions.get('window'),
  children,
  BackdropComponent,
  OverlayComponent,
  onReady = workletNoop,
}: LightboxTransitionProps) {
  const [renderChildren, setRenderChildren] = useState<boolean>(
    false,
  );

  const { x, y, width, height } = measurements;
  const { uri } = item;

  const targetWidth = dimensions.width;
  const scaleFactor = item.width / targetWidth;
  const targetHeight = item.height / scaleFactor;

  const animationProgress = useSharedValue(0);

  const opacity = useSharedValue(0);
  const imageOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const targetX = useSharedValue(0);
  const targetY = useSharedValue(
    (dimensions.height - targetHeight) / 2,
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const imageStyles = useAnimatedStyle(() => {
    const interpolateProgress = (range: [number, number]) =>
      interpolate(animationProgress.value, [0, 1], range);

    const top =
      translateY.value + interpolateProgress([y, targetY.value]);
    const left =
      translateX.value + interpolateProgress([x, targetX.value]);

    return {
      opacity: imageOpacity.value,
      position: 'absolute',
      top,
      left,
      width: interpolateProgress([width, targetWidth]),
      height: interpolateProgress([height, targetHeight]),
      transform: [
        {
          scale: scale.value,
        },
      ],
    };
  });

  useEffect(() => {
    onReady();
    animationProgress.value = withTiming(1, timingConfig, () => {
      opacity.value = 1;
      setRenderChildren(true);
    });
  }, []);

  // we need to hide lightbox component
  // after children is rendered
  function onChildrenLayout() {
    if (imageOpacity.value === 0) {
      return;
    }

    requestAnimationFrame(() => {
      imageOpacity.value = 0;
    });
  }

  const backdropStyles = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'black',
      opacity: animationProgress.value,
    };
  });

  const childrenAnimateStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {BackdropComponent && (
        <BackdropComponent animatedStyles={backdropStyles} />
      )}

      <Animated.View style={StyleSheet.absoluteFillObject}>
        <AnimatedImage source={{ uri }} style={imageStyles} />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFillObject, childrenAnimateStyle]}
      >
        {renderChildren && (
          <Animated.View
            style={[StyleSheet.absoluteFillObject, ,]}
            onLayout={onChildrenLayout}
          >
            {children}
          </Animated.View>
        )}
      </Animated.View>

      {OverlayComponent && <OverlayComponent />}
    </View>
  );
}