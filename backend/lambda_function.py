import boto3
import io
import json
import numpy as np
import matplotlib.pyplot as plt
import uuid
import os


endpoint_name = os.environ['AWS_SM_EP']
bucket_name = os.environ['OUT_S3_BUCKET_NAME']
s3_client = boto3.client('s3', region_name='us-east-1')
s3 = boto3.resource('s3', region_name='us-east-1')


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
