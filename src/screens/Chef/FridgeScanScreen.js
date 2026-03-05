import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { scanFridgeThunk } from '../../store/slices/fridgeSlice';
import * as Haptics from 'expo-haptics';

const inferMimeType = (uri = '', fallback = 'image/jpeg') => {
  if (typeof uri !== 'string') return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return fallback;
};

export default function FridgeScanScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  const processFridgeImage = async (imageBase64, mimeType = 'image/jpeg') => {
    if (!imageBase64 || imageBase64.length < 2000) {
      throw new Error('Image is too blurry or invalid. Please retake with better lighting.');
    }

    await dispatch(scanFridgeThunk({ imageBase64, mimeType })).unwrap();
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.9,
      });
      await processFridgeImage(photo?.base64, inferMimeType(photo?.uri, 'image/jpeg'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Fridge Scanned!',
        'Ingredients identified successfully!',
        [
          { text: 'Generate Recipe', onPress: () => nav.navigate('RecipeResult') },
          { text: 'Back to Kitchen', onPress: () => nav.goBack() },
        ]
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Scan Failed', e.message || 'Could not scan fridge. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const uploadFridgePhoto = async () => {
    Haptics.selectionAsync();
    setScanning(true);
    try {
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to upload a fridge image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker?.MediaType?.Images ? [ImagePicker.MediaType.Images] : ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
        base64: true,
      });

      if (result.canceled) return;
      const selected = result.assets?.[0];
      const mimeType = selected?.mimeType || inferMimeType(selected?.uri);
      let base64Data = selected?.base64;

      if (!base64Data && selected?.uri) {
        base64Data = await FileSystem.readAsStringAsync(selected.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      await processFridgeImage(base64Data, mimeType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Fridge Scanned!',
        'Ingredients identified successfully!',
        [
          { text: 'Generate Recipe', onPress: () => nav.navigate('RecipeResult') },
          { text: 'Back to Kitchen', onPress: () => nav.goBack() },
        ]
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload Failed', e?.message || 'Could not scan fridge image. Try a clearer photo.');
    } finally {
      setScanning(false);
    }
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles(colors).permContainer}>
        <Text style={styles(colors).permTitle}>📷 Camera Access Needed</Text>
        <Text style={styles(colors).permDesc}>
          FridgeToFork needs camera access to scan your fridge and identify ingredients.
        </Text>
        <TouchableOpacity style={styles(colors).permBtn} onPress={requestPermission}>
          <Text style={styles(colors).permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles(colors).uploadBtnLight} onPress={uploadFridgePhoto}>
          <Text style={styles(colors).uploadBtnLightText}>Upload Fridge Photo Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      <View style={styles(colors).overlay} pointerEvents="none">
        <View style={styles(colors).frame} />
        <Text style={styles(colors).hint}>
          Point at your fridge and tap capture
        </Text>
      </View>
      <View style={styles(colors).captureRow}>
        {scanning ? (
          <View style={styles(colors).loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Scanning...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles(colors).captureBtn} onPress={takePicture}>
              <Text style={{ fontSize: 32 }}>📸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles(colors).uploadBtn} onPress={uploadFridgePhoto}>
              <Text style={styles(colors).uploadBtnText}>Upload Fridge Photo</Text>
            </TouchableOpacity>
          </>
        )}
        </View>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  permContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: c.background },
  permTitle:     { ...typography.h3, color: c.text, textAlign: 'center', marginBottom: spacing.md },
  permDesc:      { ...typography.body, color: c.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  permBtn:       { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, paddingHorizontal: spacing.xl },
  permBtnText:   { ...typography.h4, color: '#fff' },
  uploadBtnLight:{ marginTop: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, paddingHorizontal: spacing.xl },
  uploadBtnLightText: { ...typography.body, color: c.text },
  overlay:       { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame:         { width: '85%', aspectRatio: 1, borderWidth: 2, borderColor: c.primary, borderRadius: radius.lg, opacity: 0.8 },
  hint:          { color: '#fff', marginTop: spacing.md, ...typography.body },
  captureRow:    { position: 'absolute', left: 0, right: 0, bottom: 60, alignItems: 'center' },
  captureBtn:    { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  uploadBtn:     { marginTop: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  uploadBtnText: { ...typography.body, color: c.text },
  loadingBox:    { alignItems: 'center', gap: spacing.sm },
  loadingText:   { color: '#fff', ...typography.body },
});