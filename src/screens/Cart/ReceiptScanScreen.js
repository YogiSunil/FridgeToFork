import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { scanReceiptThunk, generateSwapsThunk, saveReceipt, clearCurrentItems } from '../../store/slices/cartSlice';
import * as Haptics from 'expo-haptics';

const getImageMediaTypes = () => {
  if (ImagePicker?.MediaType?.Images) {
    return [ImagePicker.MediaType.Images];
  }
  if (ImagePicker?.MediaTypeOptions?.Images) {
    return ImagePicker.MediaTypeOptions.Images;
  }
  return ['images'];
};

const inferMimeType = (uri = '', fallback = 'image/jpeg') => {
  if (typeof uri !== 'string') return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return fallback;
};

export default function ReceiptScanScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState('scan');
  const [cameraError, setCameraError] = useState('');
  const { currentItems, currentSwaps, loading, swapsLoading } = useSelector(s => s.cart);

  const toPrice = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^\d.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const getErrorMessage = (error, fallback) => {
    const raw = typeof error === 'string' && error.trim()
      ? error
      : (error?.message || '');

    if (/unable to process input image/i.test(raw)) {
      return 'Image could not be read clearly. Try Upload Receipt Photo, keep full receipt in frame, and use a sharper image.';
    }

    if (raw) return raw;
    return fallback;
  };

  const processReceiptBase64 = async (base64Data, mimeType = 'image/jpeg') => {
    if (!base64Data) throw new Error('No image data');
    await dispatch(scanReceiptThunk({ imageBase64: base64Data, mimeType })).unwrap();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('review');
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.9 });
      await processReceiptBase64(photo?.base64, inferMimeType(photo?.uri, 'image/jpeg'));
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Scan Failed', getErrorMessage(e, 'Could not read receipt. Try better lighting.'));
    }
  };

  const pickReceiptFromGallery = async () => {
    Haptics.selectionAsync();
    try {
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to upload a receipt image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImageMediaTypes(),
        quality: 0.6,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 0,
        base64: true,
      });

      if (result.canceled) return;
      const selectedAssets = Array.isArray(result.assets) ? result.assets : [];
      if (!selectedAssets.length) {
        throw new Error('No image selected');
      }

      if (selectedAssets.length === 1) {
        const selected = selectedAssets[0];
        const mimeType = selected?.mimeType || inferMimeType(selected?.uri);
        let base64Data = selected?.base64;

        if (!base64Data && selected?.uri) {
          base64Data = await FileSystem.readAsStringAsync(selected.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        await processReceiptBase64(base64Data, mimeType);
        return;
      }

      let savedCount = 0;
      for (const asset of selectedAssets) {
        try {
          const mimeType = asset?.mimeType || inferMimeType(asset?.uri);
          let base64Data = asset?.base64;
          if (!base64Data && asset?.uri) {
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
          const items = await dispatch(scanReceiptThunk({ imageBase64: base64Data, mimeType })).unwrap();
          dispatch(saveReceipt({ items, swaps: [] }));
          savedCount += 1;
        } catch {
        }
      }

      dispatch(clearCurrentItems());

      if (savedCount > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Receipts Saved', `${savedCount} receipt${savedCount > 1 ? 's were' : ' was'} uploaded and saved.`);
        nav.goBack();
      } else {
        throw new Error('Could not process selected receipts');
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload Failed', getErrorMessage(e, 'Could not upload receipt image. Please try again.'));
    }
  };

  const handleGetSwaps = async () => {
    await dispatch(generateSwapsThunk(currentItems)).unwrap();
    setPhase('swaps');
  };

  const handleSave = () => {
    dispatch(saveReceipt({ items: currentItems, swaps: currentSwaps }));
    dispatch(clearCurrentItems());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nav.goBack();
  };

  const s = styles(colors);

  if (!permission?.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permTitle}>📷 Camera Access Needed</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.galleryBtn} onPress={pickReceiptFromGallery}>
          <Text style={s.galleryBtnText}>Upload Receipt Photo Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'scan') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!cameraError ? (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              onMountError={(event) => {
                const message = event?.nativeEvent?.message || 'Camera preview failed to load';
                setCameraError(message);
              }}
            />
          </View>
        ) : (
          <View style={s.cameraFallback}>
            <Text style={s.cameraFallbackTitle}>Camera preview unavailable</Text>
            <Text style={s.cameraFallbackText}>You can still upload a receipt photo from your gallery.</Text>
          </View>
        )}
        <View style={s.overlay} pointerEvents="none">
          <View style={s.frame} />
          <Text style={s.hint}>Point at your receipt</Text>
        </View>
        <View style={s.captureRow}>
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Reading receipt...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={s.captureBtn} onPress={takePicture}>
                <Text style={{ fontSize: 32 }}>📸</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.uploadBtn} onPress={pickReceiptFromGallery}>
                <Text style={s.uploadBtnText}>Upload Receipt Photo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (phase === 'review') {
    return (
      <SafeAreaView style={s.safe}>
        <FlatList
          data={currentItems}
          keyExtractor={(_, i) => i.toString()}
          ListHeaderComponent={
            <View style={{ padding: spacing.md }}>
              <Text style={s.phaseTitle}>✅ {currentItems.length} Items Found</Text>
              <Text style={s.phaseSub}>
                Total: ${currentItems.reduce((sum, i) => sum + toPrice(i?.price), 0).toFixed(2)}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemCat}>{item.category}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.itemPrice}>${toPrice(item?.price).toFixed(2)}</Text>
                <Text style={[s.itemHealth, { color: item.isHealthy ? colors.success : colors.warning }]}>
                  {item.isHealthy ? '✅ healthy' : '⚠️ swap?'}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <TouchableOpacity
                style={[s.primaryBtn, swapsLoading && { opacity: 0.6 }]}
                onPress={handleGetSwaps}
                disabled={swapsLoading}
              >
                <Text style={s.primaryBtnText}>
                  {swapsLoading ? '🤖 Analyzing...' : '💡 Get Healthier Swaps'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleSave}>
                <Text style={s.secondaryBtnText}>💾 Save Without Swaps</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={currentSwaps}
        keyExtractor={(_, i) => i.toString()}
        ListHeaderComponent={
          <Text style={s.phaseTitle2}>💡 {currentSwaps.length} Swap Suggestions</Text>
        }
        renderItem={({ item }) => (
          <View style={s.swapCard}>
            <Text style={s.swapOriginal}>❌ {item.original}</Text>
            {item.healthierSwap && (
              <View style={{ marginTop: spacing.xs }}>
                <Text style={s.swapHealthy}>✅ {item.healthierSwap}</Text>
                <Text style={s.swapReason}>{item.healthierReason}</Text>
              </View>
            )}
            {item.cheaperSwap && (
              <View style={{ marginTop: spacing.xs }}>
                <Text style={s.swapCheap}>💰 {item.cheaperSwap}</Text>
                <Text style={s.swapReason}>
                  {item.cheaperReason}{item.savings ? ` • Save $${item.savings}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={[s.primaryBtn, { margin: spacing.md }]} onPress={handleSave}>
            <Text style={s.primaryBtnText}>💾 Save Receipt & Swaps</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:            { flex: 1, backgroundColor: c.background },
  permContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: c.background },
  permTitle:       { ...typography.h3, color: c.text, textAlign: 'center', marginBottom: spacing.md },
  permBtn:         { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, paddingHorizontal: spacing.xl },
  permBtnText:     { ...typography.h4, color: '#fff' },
  galleryBtn:      { marginTop: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, paddingHorizontal: spacing.xl },
  galleryBtnText:  { ...typography.body, color: c.text },
  overlay:         { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame:           { width: '80%', height: '60%', borderWidth: 2, borderColor: c.primary, borderRadius: radius.md },
  hint:            { color: '#fff', marginTop: spacing.md, ...typography.body },
  captureRow:      { position: 'absolute', left: 0, right: 0, bottom: 60, alignItems: 'center', zIndex: 20, elevation: 20 },
  captureBtn:      { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  uploadBtn:       { marginTop: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  uploadBtnText:   { ...typography.body, color: c.text },
  cameraFallback:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  cameraFallbackTitle: { ...typography.h4, color: '#fff', marginBottom: spacing.xs },
  cameraFallbackText:  { ...typography.bodyS, color: '#ddd', textAlign: 'center' },
  loadingBox:      { alignItems: 'center', gap: spacing.sm },
  loadingText:     { color: '#fff', ...typography.body },
  phaseTitle:      { ...typography.h3, color: c.text, marginBottom: spacing.xs },
  phaseTitle2:     { ...typography.h3, color: c.text, padding: spacing.md },
  phaseSub:        { ...typography.body, color: c.textSecondary, marginBottom: spacing.md },
  itemRow:         { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, backgroundColor: c.surface, marginHorizontal: spacing.md, marginBottom: spacing.xs, borderRadius: radius.md },
  itemName:        { ...typography.body, color: c.text },
  itemCat:         { ...typography.bodyS, color: c.textMuted },
  itemPrice:       { ...typography.body, color: c.primary },
  itemHealth:      { ...typography.caption },
  primaryBtn:      { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.md },
  primaryBtnText:  { ...typography.h4, color: '#fff' },
  secondaryBtn:    { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  secondaryBtnText:{ ...typography.body, color: c.text },
  swapCard:        { backgroundColor: c.surface, margin: spacing.md, marginBottom: 0, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },
  swapOriginal:    { ...typography.body, color: c.error },
  swapHealthy:     { ...typography.body, color: c.success },
  swapCheap:       { ...typography.body, color: c.primary },
  swapReason:      { ...typography.bodyS, color: c.textSecondary },
});