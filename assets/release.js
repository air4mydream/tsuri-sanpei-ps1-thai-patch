/* Release pins: exact approved BINs and assets. */
(function(root){
const release={
  "version": "0.33",
  "serial": "SLPS-03445",
  "manifest_sha256": "caf853dbd1de45e215b08116e0b1fc973257786305c95e54c9d7f2e3c29466fb",
  "cue_sha256": "11a2d7b58d4eb2abb5b33d92596ad48ccd50c39699bee648607ed82c84225d1e",
  "manifest_file": "patch-manifest.json",
  "patch_file": "patch_th.bps",
  "cue_file": "TsuriKichiSanpei_TH_v0.33.cue",
  "source": {
    "filename": "Simple Character 2000 Series Vol. 09 - Tsurikichi Sanpei - The Tsuri (Japan).bin",
    "size": 266077056,
    "sha256": "43f35a2a7f5057e0ffc86740221e26cd8f9050f0572b67e9a0749ca0a5981419",
    "crc32": "1463101c",
    "layout": {
      "sector_bytes": 2352,
      "user_data_offset": 24,
      "volume_label": "SLPS_03445",
      "boot": "SLPS_034.45"
    }
  },
  "target": {
    "filename": "Simple Character 2000 Series Vol. 09 - Tsurikichi Sanpei - The Tsuri (Japan).bin",
    "output_filename": "TsuriKichiSanpei_TH_v0.33.bin",
    "size": 266077056,
    "sha256": "49e83ba6212cebfe26d3ea779a4c434269e37a98437d4d40e06cc61a6bdb785d",
    "crc32": "d3cb5a92",
    "layout": {
      "sector_bytes": 2352,
      "user_data_offset": 24,
      "volume_label": "SLPS_03445",
      "boot": "SLPS_034.45"
    }
  },
  "patch": {
    "filename": "patch_th.bps",
    "format": "BPS1",
    "size": 2618658,
    "sha256": "4141e9bdca73bef5eb7e9ee9f79411e05f16bd61a404f9acab57f06f4a9d1147",
    "crc32": "2144df1c",
    "bps_footer_crc32": "24cd3e1e",
    "commands": [
      "SourceRead",
      "TargetRead"
    ]
  }
};
root.TsuriRelease=release;
if(typeof module!=="undefined"&&module.exports)module.exports=release;
})(globalThis);
