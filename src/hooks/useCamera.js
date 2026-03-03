export default function useCamera() {
  return {
    hasPermission: false,
    requestPermission: async () => false,
    takePhoto: async () => null,
  };
}