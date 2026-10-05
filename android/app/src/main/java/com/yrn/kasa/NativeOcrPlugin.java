package com.yrn.kasa;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import androidx.annotation.NonNull;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;
import java.io.InputStream;

@CapacitorPlugin(name = "NativeOcr")
public class NativeOcrPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void recognizeText(PluginCall call) {
        String base64 = call.getString("base64");
        String uriStr = call.getString("uri");

        try {
            Bitmap bitmap = null;

            if (base64 != null && !base64.isEmpty()) {
                if (base64.contains(",")) {
                    base64 = base64.substring(base64.indexOf(",") + 1);
                }
                byte[] decoded = Base64.decode(base64, Base64.DEFAULT);
                bitmap = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
            } else if (uriStr != null && !uriStr.isEmpty()) {
                Uri uri = Uri.parse(uriStr);
                InputStream stream = getContext().getContentResolver().openInputStream(uri);
                bitmap = BitmapFactory.decodeStream(stream);
            }

            if (bitmap == null) {
                call.reject("Görsel yüklenemedi");
                return;
            }

            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

            recognizer.process(image)
                .addOnSuccessListener(new OnSuccessListener<Text>() {
                    @Override
                    public void onSuccess(Text visionText) {
                        JSObject ret = new JSObject();
                        ret.put("text", visionText.getText());
                        // Satır bazlı kutular: JS tarafı aynı hizadaki etiket + tutarı tek satıra birleştirir
                        JSArray lines = new JSArray();
                        for (Text.TextBlock block : visionText.getTextBlocks()) {
                            for (Text.Line line : block.getLines()) {
                                android.graphics.Rect box = line.getBoundingBox();
                                if (box == null) continue;
                                JSObject l = new JSObject();
                                l.put("text", line.getText());
                                l.put("left", box.left);
                                l.put("top", box.top);
                                l.put("right", box.right);
                                l.put("bottom", box.bottom);
                                lines.put(l);
                            }
                        }
                        ret.put("lines", lines);
                        call.resolve(ret);
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        call.reject("ML Kit okuma hatası: " + e.getMessage());
                    }
                });
        } catch (Exception e) {
            call.reject("İşlem hatası: " + e.getMessage());
        }
    }
}
