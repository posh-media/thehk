import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEventListener } from 'react-native';

export function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show: KeyboardEventListener = (e) => {
      setIsVisible(true);
      setHeight(e.endCoordinates.height);
    };
    const hide: KeyboardEventListener = () => {
      setIsVisible(false);
      setHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', show);
    const hideSub = Keyboard.addListener('keyboardDidHide', hide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { isVisible, height };
}
