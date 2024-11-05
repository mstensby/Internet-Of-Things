import depthai as dai
import numpy as np
import cv2
import tflite_runtime.interpreter as tflite
import RPi.GPIO as GPIO
from LCD import LCD_Contoller
from collections import Counter

import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

import time
import datetime
import random

# Set GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO pin 17 as output for the buzzer
GPIO.setup(17, GPIO.OUT)
GPIO.output(17, GPIO.LOW)  # Initialize buzzer state to quiet

# Set up GPIO pin 27 as input for the first button with a pull-down resistor
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# Set up GPIO pin 22 as input for the second button with a pull-down resistor
GPIO.setup(22, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# Initialize button previous states
initial_button_state_27 = GPIO.LOW
initial_button_state_22 = GPIO.LOW
loop_started = False

def read_first_line(file_path):
    try:
        with open(file_path, 'r') as file:
            first_line = file.readline()
            return first_line.strip()  # Strip any leading/trailing whitespace
    except FileNotFoundError:
        print("File not found.")
    except Exception as e:
        print("An error occurred:", e)

def start_timer():
    return time.time()

def stop_timer(start_time):
    return time.time() - start_time

# Initialize the camera and pipeline
def create_pipeline():
    pipeline = dai.Pipeline()
 
    # Create a color camera node
    cam_rgb = pipeline.createColorCamera()
    cam_rgb.setPreviewSize(224, 224)  # Set the size according to your model input
    cam_rgb.setInterleaved(False)
 
    # Create an XLinkOut node for the camera output
    xout_rgb = pipeline.createXLinkOut()
    xout_rgb.setStreamName("rgb")
    cam_rgb.preview.link(xout_rgb.input)
 
    return pipeline
 
# Load the TensorFlow Lite model
def load_model(model_path):
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    return interpreter
 
# Preprocess the image
def preprocess_image(image):
    # Depending on your model's requirement, adjust preprocessing steps
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = np.uint8(image)  # Convert to UINT8 without scaling (NEED to do this because its a quantized model)
    image = np.expand_dims(image, axis=0)
    return image
 
# Run the model inference
def run_inference(interpreter, image):
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
 
    interpreter.set_tensor(input_details[0]['index'], image)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    return output_data
 
# Main execution
def main():
    # Initialize Firebase app with credentials
    cred = credentials.Certificate("../firebase.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://iot-projec-bacda-default-rtdb.firebaseio.com'
    })

    # Get a reference to the Firebase Realtime Database
    database = db.reference()

    # Get device code
    file_path = "code.txt" 
    code = read_first_line(file_path)
    keys = database.child('pis').child(code).get().keys()

    lcd = LCD_Contoller()
    global loop_started  # Declare loop_started as a global variable
   
    arr = 10 * [0]
    i = 0
    confidence = 0
    model_path = './model/model2.tflite'  # Change this to your model file
    pipeline = create_pipeline()
    interpreter = load_model(model_path)
    name = ""
    sum_arr = 10 * [0]
    averageList = []
    distracted = False
    distracted_start_time = None
    wroteToLine2 = False

    # Connect to the device and start the pipeline
    with dai.Device(pipeline) as device:
        queue = device.getOutputQueue(name="rgb", maxSize=4, blocking=False)
 
        # Initialize button previous state
        initial_button_state_27 = GPIO.input(27)
        initial_button_state_22 = GPIO.input(22)
        start_time = None  # Variable to store start time

        print("Press Button To Start")  
        lcd.print_message("Press To Start") 


        while True:  # Assuming this is within a loop
            # Check for button 27 release
            button_27_current_state = GPIO.input(27)
            if initial_button_state_27 == GPIO.HIGH and button_27_current_state == GPIO.LOW:
                if name == "":
                    name = list(keys)[0] # Start loop for Nate
                    loop_started = True
                    print(name + " started")
                    start_time = start_timer()  # Start timer
                    lcd.print_message("User: " + name)
                elif name == name:
                    print(name + " stopped")
                    lcd.print_message("Session Stopped")
                    lcd.clear2()
                    loop_started = False
                    GPIO.output(17, GPIO.LOW)  # Sound the buzzer
                    if start_time is not None:
                        elapsed_time = stop_timer(start_time)
                        elapsed_time = float("{:.2f}".format(elapsed_time))
                        print("Elapsed time:", elapsed_time)
                    current_datetime = datetime.datetime.now()
                    formatted_month = str(current_datetime.month)
                    if formatted_month.startswith('0'):
                        formatted_month = formatted_month[1:]  # Remove leading zero if present

                    formatted_datetime = "{0}-{1:02d}-{2:02d} {3:02d}:{4:02d}".format(formatted_month, current_datetime.day, current_datetime.year % 100, current_datetime.hour, current_datetime.minute)
                    lengthOfArray = len(averageList)
                    decibalArray = [random.randint(0, 150) for _ in range(lengthOfArray)]

                    try:
                        #database.update({'example': 60})
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child("decibels").set(decibalArray)
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child("distractedness").set(averageList)
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child('duration').set(elapsed_time)
                        print("Data added successfully.")
                    except Exception as e:
                        print("An error occurred:", e)
                    
                    name = ""
                    averageList = []
                    arr = 10 * [0]

            initial_button_state_27 = button_27_current_state
 
            # Check for button 22 release
            button_22_current_state = GPIO.input(22)
            if initial_button_state_22 == GPIO.HIGH and button_22_current_state == GPIO.LOW:
                if name == "":
                    name = list(keys)[1]  # Start loop for Nick
                    loop_started = True
                    print(name + " started")
                    start_time = start_timer()  # Start timer
                    lcd.print_message("User: " + name)
                elif name == name:
                    print(name + " stopped")
                    lcd.print_message("Session Stopped")
                    lcd.clear2()
                    loop_started = False
                    GPIO.output(17, GPIO.LOW)  # Sound the buzzer
                    if start_time is not None:
                        elapsed_time = stop_timer(start_time)
                        elapsed_time = float("{:.2f}".format(elapsed_time))
                        print("Elapsed time:", elapsed_time)
                    current_datetime = datetime.datetime.now()
                    formatted_month = str(current_datetime.month)
                    if formatted_month.startswith('0'):
                        formatted_month = formatted_month[1:]  # Remove leading zero if present
                    formatted_datetime = "{0}-{1:02d}-{2:02d} {3:02d}:{4:02d}".format(formatted_month, current_datetime.day, current_datetime.year % 100, current_datetime.hour, current_datetime.minute)
                    
                    lengthOfArray = len(averageList)
                    decibalArray = [random.randint(0, 150) for _ in range(lengthOfArray)]
                    
                    try:
                        #database.update({'example': 60})
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child("decibels").set(decibalArray)
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child("distractedness").set(averageList)
                        database.child('pis').child(code).child(name).child('sessions').child(formatted_datetime).child("duration").set(elapsed_time)
                        print("Data added successfully.")
                    except Exception as e:
                        print("An error occurred:", e)
                    
                    name = ""
                    averageList = []
                    arr = 10 * [0]
            initial_button_state_22 = button_22_current_state
 
            if loop_started:
                frame = queue.get()  # Blocking call, will wait until a new data has arrived
                image = frame.getCvFrame()
                preprocessed_image = preprocess_image(image)
                output = run_inference(interpreter, preprocessed_image)

                noDistractedClass = output[0][0]
                immediateDistractedClass = output[0][1]
                delayDistractedClass = output[0][2]

                # Create a list of values and variables
                values = [noDistractedClass, immediateDistractedClass, delayDistractedClass]
                variables = ['noDistractedClass', 'immediateDistractedClass', 'delayDistractedClass']

                # Find the index of the maximum value
                max_index = values.index(max(values))

                # Get the variable name with the maximum value
                variable_with_max_value = variables[max_index]

                #print("Variable with maximum value:", variable_with_max_value)
 
                if variable_with_max_value == 'noDistractedClass':
                    arr[i % 10] = 0
                elif variable_with_max_value == 'immediateDistractedClass':
                    arr[i % 10] = 1
                elif variable_with_max_value == 'delayDistractedClass':
                    arr[i % 10] = 2
 
                counts = Counter(arr)
                most_common_number = max(counts, key=counts.get)
                #print("The number", most_common_number, "appears the most in the array.")
 
                if most_common_number == 0:
                    sum_arr[i % 10] = 0
                    GPIO.output(17, GPIO.LOW)  # Turn the buzzer off
                    if wroteToLine2 == True:
                        lcd.clear2()
                        wroteToLine2 = False
                    distracted = False
                elif most_common_number == 1:
                    sum_arr[i % 10] = 1
                    GPIO.output(17, GPIO.HIGH)  # Turn the buzzer on
                    if wroteToLine2 == False:
                        lcd.lcd_string("Distracted", 2)
                        wroteToLine2 = True
                    distracted = False
                elif most_common_number == 2:
                    if not distracted:
                        distracted_start_time = time.time()
                        distracted = True
                        sum_arr[i % 10] = 0
                    elif time.time() - distracted_start_time >= 2.5:
                        sum_arr[i % 10] = 1
                        GPIO.output(17, GPIO.HIGH)  # Turn the buzzer on
                        if wroteToLine2 == False:
                            lcd.lcd_string("Distracted", 2)
                            wroteToLine2 = True
                    else:
                        GPIO.output(17, GPIO.LOW)  # Turn the buzzer off
                        sum_arr[i % 10] = 0
                        if wroteToLine2 == True:
                            lcd.clear2()
                            wroteToLine2 = False
 
                if i % 10 == 0:
                    averageList.append(sum(sum_arr)/10)
                    print(averageList)

                i += 1
                if i >= 100:
                    i = 0

 
if __name__ == "__main__":
    main()
