import urllib.request
import urllib.error
import time
import json
import os
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed

# Clave tomada de Desmulta/.env (gemini_api_key)
GEMINI_API_KEY = "AQ.Ab8RN6KF4BeWzAAGgd7efe99zwLFybtcSn3EwMpNoOwbLbM1TQ"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

def fetch(base64_image):
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Extrae el texto de esta multa de transito."},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }
        ]
    }
    payload_str = json.dumps(payload)
    
    headers = {
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(GEMINI_URL, data=payload_str.encode('utf-8'), headers=headers, method='POST')
    
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            response.read() # Consumir el cuerpo completo
            end_time = time.perf_counter()
            return status, end_time - start_time
    except urllib.error.HTTPError as e:
        end_time = time.perf_counter()
        error_body = e.read().decode('utf-8')
        return f"{e.code} - {error_body}", end_time - start_time
    except Exception as e:
        end_time = time.perf_counter()
        return f"Error: {str(e)}", end_time - start_time

def main():
    print("Iniciando Benchmark de Gemini AI (Google Gen AI REST API)...")
    
    test_image_path = os.path.join(os.path.dirname(__file__), '../real-test.jpg')
    if not os.path.exists(test_image_path):
        print(f"Error: No se encontró la imagen de prueba en {test_image_path}")
        return
        
    with open(test_image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
    # Usaremos una concurrencia MUY baja (3) para no explotar el Rate Limit gratuito (15 RPM) 
    # de Gemini y evitar 429 Too Many Requests.
    concurrency = 3 
    
    print(f"Disparando {concurrency} peticiones concurrentes a Gemini...")
    
    results = []
    start_total = time.perf_counter()
    
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(fetch, encoded_string) for _ in range(concurrency)]
        for future in as_completed(futures):
            results.append(future.result())
            
    end_total = time.perf_counter()

    successes = [r for r in results if r[0] == 200]
    failures = [r for r in results if r[0] != 200]
    
    latencies = [r[1] for r in results]
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    min_latency = min(latencies)
    
    print("\n--- Resultados del Benchmark (Gemini AI) ---")
    print(f"Total Requests: {concurrency}")
    print(f"Éxitos (200 OK): {len(successes)}")
    print(f"Fallos/Errores: {len(failures)}")
    if failures:
        print(f"Ejemplo de fallo: {failures[0][0]}")
    print(f"Tiempo total de la prueba: {end_total - start_total:.2f}s")
    print(f"Latencia Promedio: {avg_latency:.2f}s")
    print(f"Latencia Mínima: {min_latency:.2f}s")
    print(f"Latencia Máxima: {max_latency:.2f}s")

if __name__ == "__main__":
    main()
