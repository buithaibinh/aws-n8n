---
title: Reduce GitHub runner costs by leveraging EC2 spot instances
date: 2025-02-05
tags: AWS,GitHub Actions,Cost Savings
draft: true
summary: Reduce GitHub runner costs by leveraging EC2 spot instances
images: []
layout: PostLayout
canonicalUrl:
authors: ['default']
---

# Mastering Cost-Efficient CI/CD with EC2 Spot Instances for GitHub Actions

When we embarked on our journey in 2023, it became glaringly evident that utilizing GitHub-hosted runners was encroaching on our budget. The escalating costs prompted us to innovate a more economical solution by integrating self-hosted runners on AWS. Fast forward a few months, and we proudly unveiled HyperEnv to the public. Each version release brought continuous improvements, culminating in version 2.9.0, where we successfully harnessed the power of EC2 spot instances, enabling significant savings by leveraging unused AWS capacity.

In this post, I'll impart the lessons we've learned along the way on optimizing CI/CD workflows with AWS Spot Instances.

## Understanding EC2 Spot vs. On-Demand Instances
AWS provides three primary pricing models for virtual machines, each catering to different use cases:

1. **On-Demand Instances**: These are the default option where users pay a fixed hourly price based on the instance type, generally charged by the second. For example, an `m5.large` instance with 2 vCPUs and 8 GiB of memory costs approximately **$0.0960 per hour** in the *us-east-1* region.
   
2. **Spot Instances**: These come with the promise of substantial discounts on unused AWS capacity. The pricing is dynamic, influenced by the demand for resources within AWS’s data centers. Currently, an `m5.large` spot instance could cost around **$0.0348 per hour**, translating to a remarkable **63.78% savings** compared to on-demand prices. However, a catch lies in the fact that AWS reserves the right to terminate spot instances with as little as a two-minute notice, commonly referred to as a 'spot interruption.'
   
3. **Savings Plans**: This is a straightforward agreement where users commit to a specific level of EC2 usage, benefiting from discounted rates. This model is particularly suited for static workloads that can be effectively planned one to three years in advance.

Choosing spot instances can dramatically reduce infrastructure costs by around 60%, but this approach requires careful consideration of a few caveats.

## Exploring Ephemeral Runners
When hosting GitHub runners on AWS, three prevalent strategies emerge:
- **Long-Running**: Launch an EC2 instance to host the GitHub runner continuously.
- **Auto-Scaled**: Automatically launch or terminate EC2 instances based on the queue of waiting jobs.
- **Ephemeral**: Provision an EC2 instance strictly for each job and terminate it once the job is completed.

Given that typical build jobs take approximately 5 to 15 minutes, utilizing ephemeral runners is highly conducive for spot instances. Since these instances are only in use for a brief period, the risk of interruption is inherently minimized, as AWS takes the duration of the instance into consideration when deciding which one to release.

## Implementing a Fallback Strategy to On-Demand Instances
Given the fluctuating availability of spot instances, there’s a possibility that AWS may reject your instance request due to insufficient capacity. To bridge this potential gap, consider implementing a fallback strategy that seamlessly transitions to on-demand instances if spot instances are unavailable.

One effective method involves combining **AWS Auto Scaling** with **CloudWatch metrics**. By monitoring the availability of spot instances, your Auto Scaling group can adjust dynamically, ensuring that your GitHub runners maintain continuous access to the necessary infrastructure resources.

In case there is trouble securing a spot instance, you could first attempt to launch it in a different availability zone or, if necessary, revert to launching an on-demand instance, safeguarding the resilience of your CI/CD pipeline.

## Evaluating Workflow Resilience against Interruptions
While the probability of an ephemeral runner running on a spot instance being interrupted is low, it is not entirely absent. Certain types of jobs, like running unit tests or builds, typically recover gracefully upon restart. In contrast, there are operations, such as a `terraform apply`, where an interruption could leave you with a corrupted state or subsequent job failures due to locked Terraform resources.

Hence, it’s vital to have the flexibility to configure which instances can utilize spot resources at the job level, preserving workflow integrity.

## Architectural Blueprint for GitHub Actions on EC2 Spot Instances
So, what does an ideal AWS architecture look like for deploying ephemeral GitHub runners using EC2 spot instances, while also allowing for a fallback to on-demand instances? Here’s a simplified flow of our proposed architecture within HyperEnv:

1. **API Gateway**: Receives an HTTP request initiated from GitHub.
2. **Lambda Function (Webhook)**: Validates the incoming event.
3. **Step Function (Runner Orchestrator)**: Manages the job execution.
4. **Spot Instance Launch**: The consumer Lambda function attempts to start a spot instance.
5. **Fallback**: If unsuccessful, the orchestrator retries to launch in a different availability zone or resorts to an on-demand instance if necessary.

## Ready to Embrace HyperEnv?
If you would prefer a ready-to-deploy and robust solution rather than starting from scratch, I invite you to explore **HyperEnv**, our streamlined solution for self-hosted GitHub Actions runners on AWS. Dive into a cost-effective and reliable CI/CD strategy for thriving in today’s fast-paced development landscape!