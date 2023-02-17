# Stable Diffusion Generative AI Fullstack Application

Lets build a full stack application to call Stable Diffusion AI model. We will first build the backend then frontend. Backend includes: 1) SageMaker 2) Lambda 3) Api Gateway. And Frontend includes react web app deployed in Amplify. 

[ view live app here](https://main.d32ou2x1stz40z.amplifyapp.com/)

- [Stable Diffusion Generative AI Fullstack Application](#stable-diffusion-generative-ai-fullstack-application)
  - [Build Backend](#build-backend)
    - [Step 1: Create SageMaker domain](#step-1-create-sagemaker-domain)
    - [Step 2: Deploy Stable Diffusion model](#step-2-deploy-stable-diffusion-model)
    - [Step 3: Run notebook to test the model (optional)](#step-3-run-notebook-to-test-the-model-optional)
    - [Step 4: Create a Lambda function that calls the SageMaker runtime invoke\_endpoint](#step-4-create-a-lambda-function-that-calls-the-sagemaker-runtime-invoke_endpoint)
      - [1: Create Function](#1-create-function)
      - [2: Add permission](#2-add-permission)
      - [3: create s3 bucket to save images](#3-create-s3-bucket-to-save-images)
      - [4: create environment variables in lambda](#4-create-environment-variables-in-lambda)
      - [7: Increase the Timeout for lambda](#7-increase-the-timeout-for-lambda)
      - [6: Add below 2 layers in lambda](#6-add-below-2-layers-in-lambda)
      - [5: Then add below code:](#5-then-add-below-code)
    - [Step 5: Create a REST API: Integration request setup](#step-5-create-a-rest-api-integration-request-setup)
    - [Step 6: Test Data via REST API using POSTMAN](#step-6-test-data-via-rest-api-using-postman)
  - [Build Frontend](#build-frontend)
    - [Step 1: Creating new React Application](#step-1-creating-new-react-application)
    - [Step 2: Initialize GitHub Repository](#step-2-initialize-github-repository)
    - [Step 3: Deploy your app with AWS Amplify](#step-3-deploy-your-app-with-aws-amplify)
    - [Step 4: Automatically deploy code changes CI/CD](#step-4-automatically-deploy-code-changes-cicd)
  - [References](#references)

## Build Backend

### Step 1: Create SageMaker domain

1. Create SageMaker Domain may take more than 30 mins.
2. Create profile

### Step 2: Deploy Stable Diffusion model

https://aws.amazon.com/blogs/machine-learning/generate-images-from-text-with-the-stable-diffusion-model-on-amazon-sagemaker-jumpstart/

### Step 3: Run notebook to test the model (optional)

### Step 4: Create a Lambda function that calls the SageMaker runtime invoke_endpoint

#### 1: Create Function

Now we have a SageMaker model endpoint. Let’s look at how we call it from Lambda. We use the SageMaker runtime API action and the Boto3 sagemaker-runtime.invoke_endpoint().
Select Runtime `Python 3.7` and use x86_64 architecture.

#### 2: Add permission

Add below permissions to `AWSLambdaBasicExecutionRole`

```json
    "Version": "2012-10-17",
    "Statement": [
        // add this one for S3 bucket and sagemaker invocation
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "sagemaker:InvokeEndpoint",
                "s3:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-1:605024711850:*"
        },
        {
            "Sid": "VisualEditor3",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "s3:*"
            ],
            "Resource": "arn:aws:logs:us-east-1:605024711850:log-group:/aws/lambda/invoke-text-to-image-stable-diffusion-model:*"
        }
    ]
}
```

#### 3: create s3 bucket to save images

create bucket called as `stabled`

#### 4: create environment variables in lambda

```
Environment variables (2)

The environment variables below are encrypted at rest with the default Lambda service key.
Key

Value
AWS_SM_EP	jumpstart-example-infer-model-txt2img-s-2023-02-16-01-51-11-187
OUT_S3_BUCKET_NAME	testbucket-rupesh
```

#### 7: Increase the Timeout for lambda

Go to configuration->General Configuration->Timeout Edit and change to `10min`

#### 6: Add below 2 layers in lambda

1. Add `AWSLambda-Python37-SciPy1x` layer for `numpy`
2. Add `Matplotlib` layer

#### 5: Then add below code:

```python
import boto3
import io
import json
import numpy as np
import matplotlib.pyplot as plt
import uuid
import os


endpoint_name = os.environ['AWS_SM_EP']
s3 = boto3.resource('s3', region_name='us-east-1')
bucket_name = os.environ['OUT_S3_BUCKET_NAME']
s3_client = boto3.client('s3', region_name='us-east-1')


def query_endpoint(text):
    runtime = boto3.client('runtime.sagemaker')

    encoded_text = json.dumps(text).encode("utf-8")
    response = runtime.invoke_endpoint(
        EndpointName=endpoint_name, ContentType='application/x-text', Body=encoded_text, Accept='application/json')

    return response


def parse_response(query_response):
    response_dict = json.loads(query_response['Body'].read())
    return response_dict['generated_image'], response_dict['prompt']


def upload_image(img, prmpt):
   print('uploading image')
   plt.figure(figsize=(12, 12))
   plt.imshow(np.array(img))
   plt.axis('off')
   plt.title(prmpt)
   img_data = io.BytesIO()
   plt.savefig(img_data, format='png')
   img_data.seek(0)
   image_name = prmpt+str(uuid.uuid4())+'.png'
   s3.Object(bucket_name, image_name).put(
       Body=img_data, ContentType='image/png')
   return s3_client.generate_presigned_url(ClientMethod='get_object', Params={'Bucket': bucket_name, 'Key': image_name}, ExpiresIn=1000)


def lambda_handler(event, context):
    print("Received event: "+json.dumps(event, indent=2))
    data = json.loads(json.dumps(event))
    text = data['data']
    print(text)
    response = query_endpoint(text)
    img, prmpt = parse_response(response)
    # Display hallucinated image
    url = upload_image(img, prmpt)

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': url
    }

```

### Step 5: Create a REST API: Integration request setup

You can create an API by following these steps:

1. On the API Gateway console, choose the REST API
2. Choose Build.
3. Select New API.
4. For API name¸ enter a name (for example, BreastCancerPredition).
5. Leave Endpoint Type as Regional.
6. Choose Create API.
7. On the Actions menu, choose Create resource.
8. Enter a name for the resource (for example, predictbreastcancer).
9. After the resource is created, on the Actions menu, choose Create Method to create a POST method.
10. For Integration type, select Lambda Function.
11. For Lambda function, enter the function you created.

When the setup is complete, you can deploy the API to a stage

12. On the Actions menu, choose Deploy API.
13. Create a new stage called test.
14. Choose Deploy.

This step gives you the invoke URL.

For more information on creating an API with API Gateway, see Creating a REST API in Amazon API Gateway. In addition, you can make the API more secure using various methods.

Now that you have an API and a Lambda function in place, let’s look at the test data.

### Step 6: Test Data via REST API using POSTMAN

1. Use the POST request `https://mko6b9drb2.execute-api.us-east-1.amazonaws.com/test/stabled`
2. Use body `{"data":"vanilla cake"}`
3. Send it will take around 20-25 sec to get you pre-signed url for image.

![](vanilla%20cake%2020f4c915-16b0-4d61-aa06-d6581f7ca566.png)

## Build Frontend

### Step 1: Creating new React Application

The easiest way to create a React application is by using the command create-react-app. Install this package using the following command in your command prompt or terminal:

👉 Make sure you have npm installed.

```
npx create-react-app stabledapp
cd stabledapp
npm start
```

### Step 2: Initialize GitHub Repository

1. Create a new GitHub repo for your app with this name `amplify-react-stabledapp` Description:`Stable Diffusion from Stability AI and AWS Sagemaker. Full stack application with AWS API gateway and Amplify React App`

2. Open a new terminal and navigate back to your app's root folder, for example, `stabledapp`
3. Using create-react-app will automatically initialize the git repo and make an initial commit.

   ```
   git init
   git add .
   git commit -m "initial commit"

   git remote add origin git@github.com:username/reponame.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy your app with AWS Amplify


In this step, you will connect the GitHub repository you just created to the AWS Amplify service. This will enable you to build, deploy, and host your app on AWS.

1. In the AWS Amplify service console, select Get Started under Amplify Hosting.

2. Select GitHub as the repository service and select Continue.

3. Authenticate with GitHub and return to the Amplify console. Choose the repository and main branch you created earlier, then select Next.

4. Accept the default build settings and select Next.

5. Review the final details and choose Save and deploy.

6. AWS Amplify will now build your source code and deploy your app at `https://...amplifyapp.com.`

7. Once the build completes, select the thumbnail to see your web app up and running live. https://main.d32ou2x1stz40z.amplifyapp.com/ 

### Step 4: Automatically deploy code changes CI/CD


In this step, you will make some changes to the code using your text editor and push the changes to the main branch of your app.

1. Edit src/App.js with the code below and save.

```
import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Hello from V2</h1>
      </header>
    </div>
  );
}

export default App;
```

2. Push the changes to GitHub in the command prompt (Windows) or terminal (macOS) to automatically kick off a new build: 
```
git add .
git commit -m “changes for v2”
git push origin main
```
3. Once the build is complete, select the thumbnail in the AWS Amplify console to view your updated app.

## References

1. https://aws.amazon.com/blogs/machine-learning/call-an-amazon-sagemaker-model-endpoint-using-amazon-api-gateway-and-aws-lambda/
2. https://aws.amazon.com/getting-started/hands-on/build-react-app-amplify-graphql/module-one/?e=gs2020&p=build-a-react-app-intro
3. https://www.youtube.com/watch?v=IwHt_QpIa8A ( convert in to mobile app using capacitor)
