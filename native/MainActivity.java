package com.ron1nz.stories.reader;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.*;
import android.net.Uri;
import android.content.Intent;
import java.io.*;
import java.util.*;

public class MainActivity extends Activity {
 private WebView web;
 private static final String HOST="appassets.androidplatform.net";
 private boolean full=false;
 private FrameLayout root;
 public class AndroidBridge {@JavascriptInterface public void setFullscreen(final boolean value){runOnUiThread(new Runnable(){public void run(){setFull(value);}});}}
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);getWindow().setStatusBarColor(Color.rgb(11,16,22));getWindow().setNavigationBarColor(Color.rgb(11,16,22));
  web=new WebView(this);web.setBackgroundColor(Color.rgb(11,16,22));root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(11,16,22));root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
  root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener(){public WindowInsets onApplyWindowInsets(View view,WindowInsets insets){view.setPadding(full?0:insets.getSystemWindowInsetLeft(),full?0:insets.getSystemWindowInsetTop(),full?0:insets.getSystemWindowInsetRight(),full?0:insets.getSystemWindowInsetBottom());return insets;}});
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setSupportZoom(false);
  web.addJavascriptInterface(new AndroidBridge(),"AndroidHost");
  web.setWebChromeClient(new WebChromeClient());
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();if(!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost()))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
    try{
     String route=uri.getPath();if(route==null||route.contains("..")||route.contains("\\")||!route.startsWith("/assets/"))throw new IOException();
     String file="www/"+route.substring(8);String extension=MimeTypeMap.getFileExtensionFromUrl(file);String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
     if(file.endsWith(".js"))mime="application/javascript";if(file.endsWith(".svg"))mime="image/svg+xml";if(file.endsWith(".ttf"))mime="font/ttf";if(mime==null)mime="application/octet-stream";
     HashMap<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("X-Content-Type-Options","nosniff");
     return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(file));
    }catch(IOException ex){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(HOST.equals(uri.getHost())&&"https".equals(uri.getScheme()))return false;if(request.isForMainFrame()&&("https".equals(uri.getScheme())||"http".equals(uri.getScheme()))){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}}return true;}
  });
  web.loadUrl("https://"+HOST+"/assets/index.html");
 }
 private void setFull(boolean value){full=value;web.setSystemUiVisibility(value?View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE:View.SYSTEM_UI_FLAG_VISIBLE);root.requestApplyInsets();}
 @Override public void onBackPressed(){web.evaluateJavascript("window.appBack ? window.appBack() : false",result->{if(!"true".equals(result)){if(full){setFull(false);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-fullscreen',{detail:false}));",null);}else finish();}});}
 @Override protected void onPause(){web.evaluateJavascript("window.nativePause && window.nativePause(true)",null);web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.nativePause && window.nativePause(false)",null);}}
 @Override protected void onDestroy(){web.removeJavascriptInterface("AndroidHost");web.destroy();super.onDestroy();}
}
