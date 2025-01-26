<?php
// Supabase Connection and Form Handling

// Fallback JSON encoding/decoding functions if extension is missing
if (!function_exists('json_encode')) {
    function json_encode($data) {
        if (is_null($data)) return 'null';
        if ($data === false) return 'false';
        if ($data === true) return 'true';
        
        if (is_scalar($data)) {
            if (is_float($data)) {
                // Always use '.' as decimal point
                return rtrim(sprintf('%.16F', $data), '0');
            }
            
            if (is_string($data)) {
                static $jsonReplaces = array(
                    array('\\', '/', '"', "\r", "\n", "\t", "\b", "\f", "\x00", "\x1f"),
                    array('\\\\', '\\/', '\\"', '\\r', '\\n', '\\t', '\\b', '\\f', '\\u0000', '\\u001f')
                );
                return '"' . str_replace($jsonReplaces[0], $jsonReplaces[1], $data) . '"';
            }
            
            return $data;
        }
        
        $isList = false;
        for ($i = 0, reset($data); $i < count($data); $i++, next($data)) {
            if (key($data) !== $i) {
                $isList = false;
                break;
            }
            $isList = true;
        }
        
        $result = array();
        if ($isList) {
            foreach ($data as $v) {
                $result[] = json_encode($v);
            }
            return '[' . implode(',', $result) . ']';
        } else {
            foreach ($data as $k => $v) {
                $result[] = json_encode($k) . ':' . json_encode($v);
            }
            return '{' . implode(',', $result) . '}';
        }
    }
}

if (!function_exists('json_decode')) {
    function json_decode($json, $assoc = false) {
        $comment = false;
        $out = '$x=';
        
        for ($i=0; $i<strlen($json); $i++) {
            if (!$comment) {
                if (($json[$i] == '{') || ($json[$i] == '[')) {
                    $out .= ' array(';
                } else if (($json[$i] == '}') || ($json[$i] == ']')) {
                    $out .= ')';
                } else if ($json[$i] == ':') {
                    $out .= '=>';
                } else {
                    $out .= $json[$i];
                }
            } else {
                $out .= $json[$i];
            }
        }
        
        $out = preg_replace('/([{,])\s*([^"]+?)\s*:/','$1"$2":',$out);
        $out = str_replace('\n', '', $out);
        $out = str_replace('\t', '', $out);
        
        if ($assoc) {
            eval($out . ';');
            return $x;
        } else {
            eval($out . ';');
            return (object)$x;
        }
    }
}

// Check if Composer autoloader exists
if (!file_exists('vendor/autoload.php')) {
    die(json_encode([
        'status' => 'error', 
        'message' => 'Composer dependencies not installed. Please run "composer install".'
    ]));
}

// Include Composer autoloader
require 'vendor/autoload.php';

// Use appropriate Supabase namespace
use Supabase\SupabaseClient;

// Supabase Configuration (IMPORTANT: Use environment variables in production!)
$supabaseUrl = 'https://nlupsphgfpvgghkkjsbu.supabase.co';
$supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXBzcGhnZnB2Z2doa2tqc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDIzNTMsImV4cCI6MjA1MzQxODM1M30.CV6f57QriX3S9tEPN0lmb3AiH8wylvzHfxgqDEGSLMw';

try {
    // Initialize Supabase Client
    $supabase = new SupabaseClient($supabaseUrl, $supabaseAnonKey);
} catch (Exception $e) {
    die(json_encode([
        'status' => 'error', 
        'message' => 'Failed to initialize Supabase client: ' . $e->getMessage()
    ]));
}

// Check if form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize and validate input
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_STRING);

    // Validate inputs
    $errors = [];
    if (empty($name)) $errors[] = "Name is required";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Invalid email format";
    if (empty($message)) $errors[] = "Message is required";

    // If no errors, proceed with Supabase insertion
    if (empty($errors)) {
        try {
            // Insert data into Supabase table
            $response = $supabase
                ->table('contacts')
                ->insert([
                    'name' => $name,
                    'email' => $email,
                    'message' => $message,
                    'submitted_at' => date('Y-m-d H:i:s')
                ]);

            // Check if insertion was successful
            if ($response) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'Form submitted successfully!'
                ]);
            } else {
                throw new Exception('Failed to submit form');
            }
        } catch (Exception $e) {
            echo json_encode([
                'status' => 'error', 
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    } else {
        // Return validation errors
        echo json_encode([
            'status' => 'error', 
            'errors' => $errors
        ]);
    }
} else {
    // Invalid request method
    echo json_encode([
        'status' => 'error', 
        'message' => 'Invalid request method'
    ]);
}
?>
