import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const toJpegBase64 = async ({ uri, base64 }) => {
  if (base64 && base64.length > 2000) {
    return { base64Data: base64, mimeType: 'image/jpeg' };
  }

  if (!uri) {
    return { base64Data: '', mimeType: 'image/jpeg' };
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  return { base64Data: manipulated?.base64 || '', mimeType: 'image/jpeg' };
};

export default function FridgeScanScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState('scan');
  const [scannedItems, setScannedItems] = useState([]);

  const processFridgeImage = async (imageBase64, mimeType = 'image/jpeg') => {
    if (!imageBase64 || imageBase64.length < 2000) {
      throw new Error('Image is too blurry or invalid. Please retake with better lighting.');
    }

    const ingredients = await dispatch(scanFridgeThunk({ imageBase64, mimeType })).unwrap();
    return Array.isArray(ingredients) ? ingredients : [];
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
      const prepared = await toJpegBase64({ uri: photo?.uri, base64: photo?.base64 });
      const ingredients = await processFridgeImage(prepared.base64Data, prepared.mimeType);
      setScannedItems(ingredients);
      setPhase('review');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      let prepared = await toJpegBase64({ uri: selected?.uri, base64: selected?.base64 });

      if (!prepared.base64Data && selected?.uri) {
        const fallbackBase64 = await FileSystem.readAsStringAsync(selected.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        prepared = { base64Data: fallbackBase64, mimeType: inferMimeType(selected?.uri) };
      }

      const ingredients = await processFridgeImage(prepared.base64Data, prepared.mimeType);
      setScannedItems(ingredients);
      setPhase('review');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  if (phase === 'review') {
    return (
      <SafeAreaView style={styles(colors).safe}>
        <FlatList
          data={scannedItems}
          keyExtractor={(item, index) => `${item?.name || 'item'}-${index}`}
          ListHeaderComponent={
            <View style={{ padding: spacing.md }}>
              <Text style={styles(colors).phaseTitle}>✅ {scannedItems.length} Items Found</Text>
              <Text style={styles(colors).phaseSub}>Review detected fridge ingredients</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles(colors).itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles(colors).itemName}>{item?.name || 'Unknown item'}</Text>
                <Text style={styles(colors).itemMeta}>{item?.category || 'other'}</Text>
              </View>
              <Text style={styles(colors).itemMeta}>{item?.quantity || '1'}</Text>
            </View>
          )}
          ListFooterComponent={
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <TouchableOpacity style={styles(colors).primaryBtn} onPress={() => nav.navigate('RecipeResult')}>
                <Text style={styles(colors).primaryBtnText}>✨ Generate Recipe</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles(colors).secondaryBtn} onPress={() => nav.goBack()}>
                <Text style={styles(colors).secondaryBtnText}>← Back to Kitchen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles(colors).tertiaryBtn} onPress={() => setPhase('scan')}>
                <Text style={styles(colors).tertiaryBtnText}>📸 Scan Again</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: c.background },
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
  phaseTitle:    { ...typography.h3, color: c.text, marginBottom: spacing.xs },
  phaseSub:      { ...typography.body, color: c.textSecondary },
  itemRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.xs },
  itemName:      { ...typography.body, color: c.text },
  itemMeta:      { ...typography.bodyS, color: c.textSecondary },
  primaryBtn:    { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.md },
  primaryBtnText:{ ...typography.h4, color: '#fff' },
  secondaryBtn:  { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  secondaryBtnText: { ...typography.body, color: c.text },
  tertiaryBtn:   { alignItems: 'center', padding: spacing.sm },
  tertiaryBtnText: { ...typography.bodyS, color: c.textSecondary },
});